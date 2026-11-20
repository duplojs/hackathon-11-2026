import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind, type Signature, type Type } from "typescript/async";
import {
	type TransformationSuccess,
	type TransformationError,
	type NotfoundTransformer,
	type TransformationNotSupported,
} from "@transformer";
import { type BuildContext } from "../../context/build";
import { goTypeOf, type GoType } from "../type/goTypeOf";
import { expressionTransformers } from "../expression";
import { coerceGoExpression } from "./either/coerce";
import { coalescingInlineFunction } from "./array/coalescing";
import { toInlineFunction } from "./string/to";

// ADR-7 (PLAN_HACKATHON.md §0.6) : fonctions passées en valeur.
//
// Une fonction passée à une fonction d'ordre supérieur (whenIsRight, map, pipe…)
// est un « callback » :
// - une fonction GÉNÉRIQUE de DuploJS connue (DArray.coalescing, DString.to) est
//   INLINÉE au point d'application, d'après le type Go de son argument : il n'y a
//   jamais de fonction générique Go en valeur (D1, D15) ;
// - toute autre expression (fonction utilisateur, fonction fléchée, forme
//   curryfiée) est traduite en valeur Go et APPELÉE.
// Les types viennent de la signature RÉSOLUE de l'appel englobant (instanciée),
// jamais de la signature générique propre de la fonction (C15).

/** Expression Go déjà évaluée, avec son type Go et, s'il est connu, son type TS. */
export interface TypedExpression {
	readonly expression: GoAST.Expression;
	readonly goType: GoType;
	readonly type?: Type;
}

export interface CallbackApplication extends TypedExpression {
	readonly before: readonly GoAST.Statement[];
}

export type CallbackApplicationResult =
	| DEither.Right<"callback-application", CallbackApplication>
	| TransformationError
	| NotfoundTransformer;

export function callbackApplication(application: CallbackApplication): CallbackApplicationResult {
	return DEither.right("callback-application", application);
}

/** Fonction DuploJS générique inlinée : reçoit son argument déjà évalué. */
export type InlineFunction = (
	argument: TypedExpression,
	site: TsAST.Node,
	context: BuildContext,
) => DCommon.MaybePromise<CallbackApplicationResult>;

export interface Callback {
	readonly before: readonly GoAST.Statement[];
	// Nombre de paramètres réellement déclarés : `() => [-12]` n'en reçoit aucun,
	// même si l'appelant lui en passe un (JS ignore les arguments en trop).
	readonly arity: number;
	apply(argumentsList: readonly TypedExpression[]): Promise<CallbackApplicationResult>;
}

export interface ExpectedSignature {
	readonly parameters: readonly (TypedParameterType)[];
	readonly returnType: Type;
	readonly returnGoType: GoType | undefined;
}

interface TypedParameterType {
	readonly type: Type;
	readonly goType: GoType;
}

async function tryGoTypeOf(type: Type, site: TsAST.Node, context: BuildContext) {
	const goType = DEither.unwrapRight(await goTypeOf(type, site, context));

	return DEither.isLeft(goType) ? undefined : goType.result;
}

async function translateSignature(
	signature: Signature,
	site: TsAST.Node,
	context: BuildContext,
): Promise<ExpectedSignature | undefined> {
	const { typeChecker } = context.transpilation;

	const parameters = await DCommon.asyncPipe(
		signature.parameters,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<readonly TypedParameterType[] | undefined>([]),
			async({ index, lastValue, next, exit }) => {
				const type = await typeChecker.getParameterType(signature, index);
				const goType = await tryGoTypeOf(type, site, context);

				return goType && lastValue
					? next(DArray.push(lastValue, {
						type,
						goType,
					}))
					: exit(undefined);
			},
		),
	);

	if (!parameters) {
		return undefined;
	}

	const returnType = await typeChecker.getReturnTypeOfSignature(signature);

	return {
		parameters,
		returnType,
		returnGoType: await tryGoTypeOf(returnType, site, context),
	};
}

async function firstCallSignature(type: Type | undefined, context: BuildContext) {
	if (!type) {
		return undefined;
	}

	const signatures = await context.transpilation.typeChecker.getSignaturesOfType(type, SignatureKind.Call);

	return DArray.first(signatures);
}

/**
 * Signature (instanciée, traduisible en Go) de la fonction attendue en `site`.
 * Candidats, dans l'ordre ; le premier dont tous les paramètres ont un type Go gagne :
 * 1. la signature RÉSOLUE de l'appel englobant, au rang de l'argument (`pipe(x, f)`,
 *    `map(arr, f)`…) : TypeScript y a instancié les génériques ;
 * 2. le type propre de `site` ; 3. son type contextuel.
 * Limite : une forme curryfiée rangée dans une constante SANS contexte
 * (`const step = whenIsRight(f)`) est typée `(input: unknown) => unknown` par
 * TypeScript lui-même : aucun type Go n'est déductible (variante 03-curried-stored).
 */
export async function resolveExpectedSignature(
	site: TsAST.Node,
	context: BuildContext,
): Promise<ExpectedSignature | undefined> {
	const { typeChecker } = context.transpilation;
	const { parent } = site;

	const candidates: readonly (() => Promise<Signature | undefined>)[] = [
		async() => {
			if (!TsAST.isCallExpression(parent) || !TsAST.isExpression(site)) {
				return undefined;
			}

			const index = parent.arguments.indexOf(site);

			if (index < 0) {
				return undefined;
			}

			const resolved = await typeChecker.getResolvedSignature(parent);

			return firstCallSignature(await typeChecker.getParameterType(resolved, index), context);
		},
		async() => firstCallSignature(await typeChecker.getTypeAtLocation(site), context),
		async() => TsAST.isExpression(site)
			? firstCallSignature(await typeChecker.getContextualType(site), context)
			: undefined,
	];

	return DCommon.asyncPipe(
		candidates,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<ExpectedSignature | undefined>(undefined),
			async({ item: getCandidate, next, exit }) => {
				const signature = await getCandidate();
				const translated = signature && await translateSignature(signature, site, context);

				return translated ? exit(translated) : next(undefined);
			},
		),
	);
}

/**
 * Types TS des paramètres de la fonction attendue en `site` (contrat Sprint 3).
 */
export async function resolveCallbackParameterTypes(
	site: TsAST.Node,
	context: BuildContext,
): Promise<readonly Type[] | undefined> {
	const signature = await resolveExpectedSignature(site, context);

	return signature && DArray.map(signature.parameters, ({ type }) => type);
}

export interface TypedParameter extends TypedExpression {
	readonly expression: GoAST.Identifier;
}

/**
 * Construit un `func` literal Go pour la fonction attendue en `site` (ADR-3, ADR-7).
 * Paramètres : signature attendue (resolveExpectedSignature). Type de retour :
 * `returnGoType` s'il est fourni, sinon celui de la signature, sinon le type Go
 * produit par `body` (fonctions génériques : seul le handler le connaît). La valeur
 * de `body` est convertie vers ce type (coerceGoExpression).
 */
export async function createFunctionValue(params: {
	site: TsAST.Node;
	context: BuildContext;
	returnGoType?: GoType;
	body(parameters: readonly TypedParameter[]): Promise<CallbackApplicationResult>;
}): Promise<
	| TransformationSuccess<GoAST.FunctionLiteral>
	| TransformationError
	| NotfoundTransformer
	| TransformationNotSupported
> {
	const { site, context, body } = params;

	const signature = await resolveExpectedSignature(site, context);

	if (!signature) {
		// Cas typique : forme curryfiée stockée sans contexte, typée
		// `(input: unknown) => unknown` par TypeScript (voir resolveExpectedSignature).
		return context.error(site, "function-value-without-instantiated-signature");
	}

	const parameters = DArray.map(
		signature.parameters,
		({ type, goType }): TypedParameter => ({
			expression: context.generateIdentifier(),
			goType,
			type,
		}),
	);

	const application = DEither.unwrapRight(await body(parameters));

	if (DEither.isLeft(application)) {
		return application;
	}

	const returnGoType = params.returnGoType ?? signature.returnGoType ?? application.goType;

	const returned = DEither.unwrapRight(
		await coerceGoExpression(
			{
				expression: application.expression,
				fromGoType: application.goType,
				toGoType: returnGoType,
				from: application.type,
			},
			context,
		),
	);

	if (DEither.isLeft(returned)) {
		return context.error(site, "unsupported-function-value-return-coercion");
	}

	return context.success({
		result: GoAST.createFunctionLiteral({
			arguments: DArray.map(
				parameters,
				({ expression, goType }) => GoAST.createFunctionArgument({
					identifier: expression,
					type: goType,
				}),
			),
			returnTypes: [returnGoType],
			body: GoAST.createBlockStatement({
				statements: [
					...application.before,
					GoAST.createReturnStatement({ values: [returned.result] }),
				],
			}),
		}),
	});
}

/** Fonction générique DuploJS inlinable référencée par `node` (identifiant ou accès). */
export async function resolveInlineFunction(
	node: TsAST.Node,
	context: BuildContext,
): Promise<InlineFunction | undefined> {
	if (!TsAST.isIdentifier(node) && !TsAST.isPropertyAccessExpression(node)) {
		return undefined;
	}

	const moduleReference = DEither.unwrapRight(
		await context.resolveReferenceModule(node, "@duplojs/lang", /^dist\/(array|string)\//),
	);

	if (DEither.isLeft(moduleReference)) {
		return undefined;
	}

	const { name } = moduleReference.symbol;
	const isArray = moduleReference.entry.startsWith("dist/array/");

	if (isArray && name === "coalescing") {
		return coalescingInlineFunction;
	}

	if (!isArray && name === "to") {
		return toInlineFunction;
	}

	return undefined;
}

/**
 * Valeur Go d'une fonction inlinable (eta-expansion, ADR-7) :
 * `func(p T) R { return <inline>(p) }`, T venant de la signature attendue.
 */
export function createInlineFunctionValue(
	node: TsAST.Node,
	inline: InlineFunction,
	context: BuildContext,
) {
	return createFunctionValue({
		site: node,
		context,
		body: async(parameters) => {
			const parameter = DArray.first(parameters);

			if (!parameter) {
				return context.error(node, "inline-function-value-without-parameter");
			}

			return inline(parameter, node, context);
		},
	});
}

/**
 * Résout un callback : fonction inlinable, ou expression traduite en valeur Go
 * (fonction utilisateur, fonction fléchée, forme curryfiée) que l'on appelle.
 * L'expression du callback est évaluée une fois, dans `before`, à l'appel de
 * resolveCallback (ordre d'évaluation JS : arguments de gauche à droite).
 */
export async function resolveCallback(
	node: TsAST.Expression,
	context: BuildContext,
): Promise<
	| DEither.Right<"callback", Callback>
	| TransformationError
	| NotfoundTransformer
> {
	const inline = await resolveInlineFunction(node, context);

	if (inline) {
		return DEither.right("callback", {
			before: [],
			arity: 1,
			apply: async(argumentsList) => {
				const argument = DArray.first(argumentsList);

				return argument
					? inline(argument, node, context)
					: context.error(node, "inline-function-without-argument");
			},
		});
	}

	const value = DEither.unwrapRight(await context.transform(node, expressionTransformers.value));

	if (DEither.isLeft(value)) {
		return value;
	}

	const functionLiteral = DModeling.hasTagValue(value.result, "[node][expression]literal-function")
		? value.result as GoAST.FunctionLiteral
		: undefined;

	const signature = await resolveExpectedSignature(node, context);

	const parameterGoTypes = functionLiteral
		? DArray.map(functionLiteral.arguments, ({ type }) => type as GoType)
		: signature && DArray.map(signature.parameters, ({ goType }) => goType);

	const returnGoType = functionLiteral
		? DArray.first(functionLiteral.returnTypes)
		: signature?.returnGoType;

	if (!parameterGoTypes || !returnGoType) {
		return context.error(node, "unable-to-resolve-callback-signature");
	}

	return DEither.right("callback", {
		before: value.before,
		arity: parameterGoTypes.length,
		apply: async(argumentsList) => {
			const coercedArguments = await DCommon.asyncPipe(
				DArray.from(parameterGoTypes.entries()),
				DGenerator.asyncReduce(
					DGenerator.reduceFrom<readonly GoAST.Expression[] | undefined>([]),
					async({ item: [index, parameterGoType], lastValue, next, exit }) => {
						const argument = argumentsList[index];

						if (!argument || !lastValue) {
							return exit(undefined);
						}

						const coerced = DEither.unwrapRight(
							await coerceGoExpression(
								{
									expression: argument.expression,
									fromGoType: argument.goType,
									toGoType: parameterGoType,
									from: argument.type,
								},
								context,
							),
						);

						return DEither.isLeft(coerced)
							? exit(undefined)
							: next(DArray.push(lastValue, coerced.result));
					},
				),
			);

			if (!coercedArguments) {
				return context.error(node, {
					reason: "callback-argument-type-mismatch",
					expected: DArray.map(parameterGoTypes, (goType) => GoPrinter.renderNode(goType)),
					received: DArray.map(argumentsList, ({ goType }) => GoPrinter.renderNode(goType)),
				});
			}

			return callbackApplication({
				before: [],
				expression: GoAST.createCallExpression({
					callee: value.result,
					arguments: coercedArguments,
				}),
				goType: returnGoType as GoType,
				type: functionLiteral ? undefined : signature?.returnType,
			});
		},
	});
}
