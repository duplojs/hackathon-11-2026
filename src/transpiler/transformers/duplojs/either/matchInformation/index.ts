import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
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
import { coerceGoExpression, eitherInformationSides } from "../coerce";
import {
	getEither2GoTypes,
	getEitherValueAccess,
	unionGoTypes,
} from "../goType";
import { eitherDependency } from "../sharedDependency";

// DEither.matchInformation(e, { info: handler, … }) / matchInformation({ … }) (ADR-9) :
//   var r T
//   switch e.Information {
//   case "negative-operand": r = coerce(h1(e.Value))
//   case "success":          r = coerce(h2(e.Value))
//   default: panic(…)
//   }
// Les clés sont lues à la transpilation. Chaque handler reçoit la valeur déballée
// et n'est évalué que dans son cas. Le `default` reproduit le TypeError de JS
// (aucun garde-fou à l'exécution ; l'exhaustivité est garantie par TypeScript).

const informationFieldIdentifier = GoAST.createIdentifier("Information");
const panicIdentifier = GoAST.createIdentifier("panic");

interface MatchCase {
	readonly information: string;
	readonly handler: Callback;
}

// Objet littéral de handlers : `{ "negative-operand": () => …, success: (v) => … }`.
async function resolveCases(
	matcherNode: TsAST.Expression,
	context: BuildContext,
) {
	if (!TsAST.isObjectLiteralExpression(matcherNode)) {
		return context.error(matcherNode, "duplojs-either-matchinformation-requires-object-literal");
	}

	return DCommon.asyncPipe(
		matcherNode.properties,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<readonly MatchCase[]>([]),
			async({ item, lastValue, next, exit }) => {
				if (
					!TsAST.isPropertyAssignment(item)
					|| (!TsAST.isIdentifier(item.name) && !TsAST.isStringLiteral(item.name))
				) {
					return exit(context.error(item, "duplojs-either-matchinformation-unsupported-property"));
				}

				const handler = DEither.unwrapRight(await resolveCallback(item.initializer, context));

				if (DEither.isLeft(handler)) {
					return exit(handler);
				}

				return next(DArray.push(lastValue, {
					information: item.name.text,
					handler,
				}));
			},
		),
	);
}

async function buildSwitch(params: {
	input: TypedExpression;
	cases: readonly MatchCase[];
	resultGoType: GoType | undefined;
	site: TsAST.Node;
	context: BuildContext;
}): Promise<CallbackApplicationResult> {
	const { input, cases, site, context } = params;

	const either2 = DEither.unwrapRight(getEither2GoTypes(input.goType));
	// ADR-13 : Either2 : chaque information lit son côté (Left ou Right).
	const sides = DEither.isLeft(either2) || !input.type
		? undefined
		: await eitherInformationSides(input.type, context);

	if (!DEither.isLeft(either2) && !sides) {
		return context.error(site, "duplojs-either-matchinformation-either2-without-type");
	}

	const valueAccess = DEither.unwrapRight(getEitherValueAccess(input.goType));

	if (DEither.isLeft(valueAccess)) {
		return context.error(site, "duplojs-either-matchinformation-input-is-not-an-either");
	}

	const caseValueAccess = (information: string) => {
		const side = sides?.get(information);

		if (DEither.isLeft(either2) || !side) {
			return sides ? undefined : valueAccess;
		}

		return side === "left"
			? {
				field: GoAST.createIdentifier("Left"),
				valueType: either2.leftType,
			}
			: {
				field: GoAST.createIdentifier("Right"),
				valueType: either2.rightType,
			};
	};

	const applications = await DCommon.asyncPipe(
		cases,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<readonly CallbackApplication[]>([]),
			async({ item, lastValue, next, exit }) => {
				const access = caseValueAccess(item.information);

				if (!access) {
					return exit(context.error(site, "duplojs-either-matchinformation-unknown-information-side"));
				}

				const application = DEither.unwrapRight(
					await item.handler.apply([
						{
							expression: GoAST.createSelectorExpression({
								target: input.expression,
								identifier: access.field,
							}),
							goType: access.valueType,
						},
					]),
				);

				return DEither.isLeft(application)
					? exit(application)
					: next(DArray.push(lastValue, application));
			},
		),
	);

	if (DEither.isLeft(applications)) {
		return applications;
	}

	const packageName = context.registerSharedDependency(eitherDependency.value);
	const resultGoType = params.resultGoType ?? DArray.reduce(
		applications,
		DArray.reduceFrom<GoType | undefined | null>(null),
		({ element, lastValue, next }) => next(
			lastValue === null
				? element.goType
				: lastValue && unionGoTypes(lastValue, element.goType, packageName),
		),
	);

	if (!resultGoType) {
		return context.error(site, "duplojs-either-matchinformation-unsupported-result-type");
	}

	const resultIdentifier = context.generateIdentifier();

	const switchCases = await DCommon.asyncPipe(
		DArray.from(applications.entries()),
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<readonly GoAST.ExpressionSwitchCase[]>([]),
			async({ item: [index, application], lastValue, next, exit }) => {
				const matchCase = cases[index];
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

				if (!matchCase || DEither.isLeft(coerced)) {
					return exit(context.error(site, "duplojs-either-matchinformation-unsupported-coercion"));
				}

				return next(DArray.push(lastValue, GoAST.createExpressionSwitchCase({
					expressions: DCommon.cast([GoAST.createStringLiteral({ value: matchCase.information })]),
					statements: [
						...application.before,
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([resultIdentifier]),
							values: DCommon.cast([coerced.result]),
						}),
					],
				})));
			},
		),
	);

	if (DEither.isLeft(switchCases)) {
		return switchCases;
	}

	return callbackApplication({
		before: [
			GoAST.createVariableDeclarationZeroValue({
				identifier: resultIdentifier,
				typeReference: resultGoType,
			}),
			GoAST.createExpressionSwitchStatementWithDefault({
				expression: GoAST.createSelectorExpression({
					target: input.expression,
					identifier: informationFieldIdentifier,
				}),
				casesBeforeDefault: switchCases,
				defaultCase: GoAST.createDefaultCase({
					statements: [
						GoAST.createCallExpression({
							callee: panicIdentifier,
							arguments: [
								GoAST.createStringLiteral({
									value: "matchInformation : information non gérée",
								}),
							],
						}),
					],
				}),
				casesAfterDefault: [],
			}),
		],
		expression: resultIdentifier,
		goType: resultGoType,
	});
}

async function directHandler(
	node: TsAST.CallExpression,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const [inputNode, matcherNode] = node.arguments;

	if (!inputNode || !matcherNode) {
		return context.error(node, "duplojs-either-matchinformation-missing-arguments");
	}

	// Ordre d'évaluation JS : e, puis l'objet des handlers.
	const input = DEither.unwrapRight(await context.transform(inputNode, expressionTransformers.value));

	if (DEither.isLeft(input)) {
		return input;
	}

	const inputGoType = DEither.unwrapRight(await goTypeOfExpression(inputNode, context));

	if (DEither.isLeft(inputGoType)) {
		return inputGoType;
	}

	const inputBinding = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: input.result,
	});

	const cases = DEither.unwrapRight(await resolveCases(matcherNode, context));

	if (DEither.isLeft(cases)) {
		return cases;
	}

	const resultGoType = DEither.unwrapRight(
		await goTypeOf(await context.transpilation.typeChecker.getTypeAtLocation(node), node, context),
	);

	const matched = DEither.unwrapRight(
		await buildSwitch({
			input: {
				expression: inputBinding.identifier,
				goType: inputGoType.result,
				type: await context.transpilation.typeChecker.getTypeAtLocation(inputNode),
			},
			cases,
			resultGoType: DEither.isLeft(resultGoType) ? undefined : resultGoType.result,
			site: node,
			context,
		}),
	);

	if (DEither.isLeft(matched)) {
		return matched;
	}

	return context.success({
		before: [
			...input.before,
			inputBinding,
			...DArray.flatMap(cases, ({ handler }) => handler.before),
			...matched.before,
		],
		result: matched.expression,
	});
}

async function curriedHandler(
	node: TsAST.CallExpression,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const [matcherNode] = node.arguments;

	if (!matcherNode) {
		return context.error(node, "duplojs-either-matchinformation-missing-matcher");
	}

	const cases = DEither.unwrapRight(await resolveCases(matcherNode, context));

	if (DEither.isLeft(cases)) {
		return cases;
	}

	const signature = await resolveExpectedSignature(node, context);

	const functionValue = DEither.unwrapRight(
		await createFunctionValue({
			site: node,
			context,
			body: async(parameters) => {
				const input = DArray.first(parameters);

				return input
					? buildSwitch({
						input,
						cases,
						resultGoType: signature?.returnGoType,
						site: node,
						context,
					})
					: context.error(node, "missing-curried-matchinformation-parameter");
			},
		}),
	);

	if (DEither.isLeft(functionValue)) {
		return functionValue;
	}

	return context.success({
		before: DArray.flatMap(cases, ({ handler }) => handler.before),
		result: functionValue.result,
	});
}

export async function matchInformationExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "duplojs-either-matchinformation-as-value-not-supported");
	}

	if (DArray.lengthEqual(node.arguments, 2)) {
		return directHandler(node, context);
	}

	if (DArray.lengthEqual(node.arguments, 1)) {
		return curriedHandler(node, context);
	}

	return context.error(node, "duplojs-either-matchinformation-unexpected-arity");
}
