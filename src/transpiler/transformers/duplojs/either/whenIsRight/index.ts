import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { goTypeOf, goTypeOfExpression, type GoType } from "../../../type/goTypeOf";
import {
	callbackApplication,
	createFunctionValue,
	resolveCallback,
	resolveExpectedSignature,
	type Callback,
	type CallbackApplication,
	type CallbackApplicationResult,
	type TypedExpression,
} from "../../application";
import { coerceGoExpression, eitherVariantNames } from "../coerce";
import {
	createEitherGoType,
	getEitherValueAccess,
	getEitherValueGoType,
	unionGoTypes,
} from "../goType";
import { eitherDependency } from "../sharedDependency";

// DEither.whenIsRight(e, f) / whenIsRight(f) et DEither.whenIsRightOtherwise(e, f, g) /
// whenIsRightOtherwise(f, g) (ADR-3, ADR-7) : inlinés dans les deux formes.
//   var r T
//   if e.IsRight() { r = coerce(f(e.Value)) } else { r = coerce(e) }        // whenIsRight
//   if e.IsRight() { r = coerce(f(e.Value)) } else { r = coerce(g(e)) }     // …Otherwise
// La forme directe évalue e, puis f (et g), dans l'ordre JS. La forme curryfiée
// évalue f (et g) à sa création, puis construit un func literal (createFunctionValue).
// Un callback n'est évalué que dans sa branche.

const isRightMethodIdentifier = GoAST.createIdentifier("IsRight");

type Kind = "whenIsRight" | "whenIsRightOtherwise";

async function assignBranch(params: {
	application: CallbackApplication;
	resultIdentifier: GoAST.Identifier;
	resultGoType: GoType;
	site: TsAST.Node;
	context: BuildContext;
}) {
	const { application, resultIdentifier, resultGoType, site, context } = params;
	const coerced = DEither.unwrapRight(
		await coerceGoExpression(
			{
				expression: application.expression,
				fromGoType: application.goType,
				toGoType: resultGoType,
				from: application.type,
			},
			context,
		),
	);

	if (DEither.isLeft(coerced)) {
		return context.error(site, "duplojs-either-whenisright-unsupported-coercion");
	}

	return DEither.right(
		"branch",
		GoAST.createBlockStatement({
			statements: [
				...application.before,
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([resultIdentifier]),
					values: DCommon.cast([coerced.result]),
				}),
			],
		}),
	);
}

/**
 * Corps commun aux quatre formes. `input` est déjà lié à un identifiant (lu
 * plusieurs fois : IsRight, Value, branche gauche). `resultGoType` : type Go du
 * résultat s'il est connu par TypeScript ; sinon il est déduit des deux branches.
 */
async function buildBranches(params: {
	input: TypedExpression;
	onRight: Callback;
	onOther: Callback | undefined;
	resultGoType: GoType | undefined;
	site: TsAST.Node;
	context: BuildContext;
}): Promise<CallbackApplicationResult> {
	const { input, onRight, onOther, site, context } = params;

	const valueAccess = DEither.unwrapRight(getEitherValueAccess(input.goType));

	if (DEither.isLeft(valueAccess)) {
		return context.error(site, "duplojs-either-whenisright-input-is-not-an-either");
	}

	const inputVariants = input.type ? await eitherVariantNames(input.type, context) : undefined;
	// Aucune variante Right dans le type de l'entrée (ex. `Fail | number`, après un
	// premier whenIsRight) : la branche Right est impossible, TypeScript n'inclut pas
	// le callback dans le type du résultat ; on ne la génère pas.
	const rightIsPossible = !inputVariants
		|| DArray.some(inputVariants, (name) => name === "Success" || name === "Right");

	const rightApplication = rightIsPossible
		? DEither.unwrapRight(
			await onRight.apply([
				{
					expression: GoAST.createSelectorExpression({
						target: input.expression,
						identifier: valueAccess.field,
					}),
					goType: valueAccess.valueType,
				},
			]),
		)
		: undefined;

	if (rightApplication && DEither.isLeft(rightApplication)) {
		return rightApplication;
	}

	const otherApplication = onOther
		? DEither.unwrapRight(await onOther.apply([input]))
		: {
			before: [],
			...input,
		};

	if (DEither.isLeft(otherApplication)) {
		return otherApplication;
	}

	const resultGoType = params.resultGoType ?? inferResultGoType({
		rightGoType: rightApplication?.goType,
		otherGoType: otherApplication.goType,
		// Branche gauche de whenIsRight : l'entrée privée de ses Right. Si ses
		// gauches ne portent pas de valeur, seule la valeur du callback compte.
		leftsAreValueless: !onOther && inputVariants !== undefined && DArray.every(
			inputVariants,
			(name) => name !== "Left",
		),
		packageName: context.registerSharedDependency(eitherDependency.value),
	});

	if (!resultGoType) {
		return context.error(site, "duplojs-either-whenisright-unsupported-result-type");
	}

	const resultIdentifier = context.generateIdentifier();

	const elseBranch = DEither.unwrapRight(
		await assignBranch({
			application: otherApplication,
			resultIdentifier,
			resultGoType,
			site,
			context,
		}),
	);

	if (DEither.isLeft(elseBranch)) {
		return elseBranch;
	}

	if (!rightApplication) {
		return callbackApplication({
			before: [
				GoAST.createVariableDeclarationZeroValue({
					identifier: resultIdentifier,
					typeReference: resultGoType,
				}),
				...elseBranch.statements,
			],
			expression: resultIdentifier,
			goType: resultGoType,
		});
	}

	const rightBranch = DEither.unwrapRight(
		await assignBranch({
			application: rightApplication,
			resultIdentifier,
			resultGoType,
			site,
			context,
		}),
	);

	if (DEither.isLeft(rightBranch)) {
		return rightBranch;
	}

	return callbackApplication({
		before: [
			GoAST.createVariableDeclarationZeroValue({
				identifier: resultIdentifier,
				typeReference: resultGoType,
			}),
			GoAST.createIfStatement({
				condition: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: input.expression,
						identifier: isRightMethodIdentifier,
					}),
					arguments: [],
				}),
				body: rightBranch,
				elseBranch,
			}),
		],
		expression: resultIdentifier,
		goType: resultGoType,
	});
}

// Type Go du résultat quand TypeScript ne le donne pas (fonction générique en valeur).
function inferResultGoType(params: {
	rightGoType: GoType | undefined;
	otherGoType: GoType;
	leftsAreValueless: boolean;
	packageName: GoAST.Identifier;
}) {
	const { rightGoType, otherGoType, leftsAreValueless, packageName } = params;

	if (!rightGoType) {
		return otherGoType;
	}

	if (leftsAreValueless) {
		return DEither.isLeft(getEitherValueGoType(rightGoType))
			? createEitherGoType(packageName, rightGoType)
			: rightGoType;
	}

	return unionGoTypes(rightGoType, otherGoType, packageName);
}

async function resolveCallbacks(
	nodes: readonly TsAST.Expression[],
	context: BuildContext,
) {
	const [onRightNode, onOtherNode] = nodes;

	if (!onRightNode) {
		return undefined;
	}

	const onRight = DEither.unwrapRight(await resolveCallback(onRightNode, context));

	if (DEither.isLeft(onRight)) {
		return onRight;
	}

	if (!onOtherNode) {
		return DEither.right("callbacks", {
			onRight,
			onOther: undefined,
		});
	}

	const onOther = DEither.unwrapRight(await resolveCallback(onOtherNode, context));

	if (DEither.isLeft(onOther)) {
		return onOther;
	}

	return DEither.right("callbacks", {
		onRight,
		onOther,
	});
}

async function directHandler(
	node: TsAST.CallExpression,
	kind: Kind,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const [inputNode, ...callbackNodes] = node.arguments;

	if (!inputNode) {
		return context.error(node, `missing-${kind}-input`);
	}

	// Ordre d'évaluation JS : e, puis les callbacks.
	const input = DEither.unwrapRight(await context.transform(inputNode, expressionTransformers.value));

	if (DEither.isLeft(input)) {
		return input;
	}

	const inputGoType = DEither.unwrapRight(await goTypeOfExpression(inputNode, context));

	if (DEither.isLeft(inputGoType)) {
		return inputGoType;
	}

	const callbacks = DEither.unwrapRight(await resolveCallbacks(callbackNodes, context) ?? context.error(node));

	if (DEither.isLeft(callbacks)) {
		return callbacks;
	}

	const { typeChecker } = context.transpilation;
	const resultGoType = DEither.unwrapRight(await goTypeOf(await typeChecker.getTypeAtLocation(node), node, context));

	// e est lu plusieurs fois : une seule évaluation, liée à un identifiant.
	const inputBinding = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: input.result,
	});

	const branches = DEither.unwrapRight(
		await buildBranches({
			input: {
				expression: inputBinding.identifier,
				goType: inputGoType.result,
				type: await typeChecker.getTypeAtLocation(inputNode),
			},
			onRight: callbacks.onRight,
			onOther: callbacks.onOther,
			resultGoType: DEither.isLeft(resultGoType) ? undefined : resultGoType.result,
			site: node,
			context,
		}),
	);

	if (DEither.isLeft(branches)) {
		return branches;
	}

	return context.success({
		before: [
			...input.before,
			inputBinding,
			...callbacks.onRight.before,
			...callbacks.onOther?.before ?? [],
			...branches.before,
		],
		result: branches.expression,
	});
}

async function curriedHandler(
	node: TsAST.CallExpression,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const callbacks = DEither.unwrapRight(await resolveCallbacks(node.arguments, context) ?? context.error(node));

	if (DEither.isLeft(callbacks)) {
		return callbacks;
	}

	const signature = await resolveExpectedSignature(node, context);

	const functionValue = DEither.unwrapRight(
		await createFunctionValue({
			site: node,
			context,
			body: async(parameters) => {
				const input = DArray.first(parameters);

				return input
					? buildBranches({
						input,
						onRight: callbacks.onRight,
						onOther: callbacks.onOther,
						resultGoType: signature?.returnGoType,
						site: node,
						context,
					})
					: context.error(node, "missing-curried-input-parameter");
			},
		}),
	);

	if (DEither.isLeft(functionValue)) {
		return functionValue;
	}

	return context.success({
		before: [...callbacks.onRight.before, ...callbacks.onOther?.before ?? []],
		result: functionValue.result,
	});
}

function createHandler(kind: Kind, directArity: number) {
	return async(
		node: TsAST.Node,
		context: BuildContext,
	): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> => {
		if (!TsAST.isCallExpression(node)) {
			return context.error(node, `duplojs-either-${kind}-as-value-not-supported`);
		}

		if (DArray.lengthEqual(node.arguments, directArity)) {
			return directHandler(node, kind, context);
		}

		if (DArray.lengthEqual(node.arguments, directArity - 1)) {
			return curriedHandler(node, context);
		}

		return context.error(node, `duplojs-either-${kind}-unexpected-arity`);
	};
}

export const whenIsRightExpressionHandler = createHandler("whenIsRight", 2);
export const whenIsRightOtherwiseExpressionHandler = createHandler("whenIsRightOtherwise", 3);
