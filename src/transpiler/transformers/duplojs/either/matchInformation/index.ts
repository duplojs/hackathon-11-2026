import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { transformCheckerType } from "../../../type/fromChecker";
import { getInformationMethodIdentifier, getValueMethodIdentifier } from "../sharedDependency";
import { getEitherRightValueType } from "../../callable";

/**
 * ```ts
 * DEither.matchInformation(input, { "negative-operand": () => "…", success: (value) => DString.to(value) })
 * ```
 * →
 * ```go
 * input := …
 * callback1 := func() string { return "…" }
 * callback2 := func(value float64) string { … }
 * var result string
 * switch input.GetInformation() {
 * case "negative-operand":
 *     result = callback1()
 * case "success":
 *     result = callback2(input.GetValue().(float64))
 * }
 * ```
 * L'entrée puis chaque callback sont évalués dans l'ordre du source, avant le `switch`,
 * comme en JS où l'objet est construit avant l'appel. Le type de la valeur passée à
 * un callback est celui de son paramètre, donné par le checker.
 */
export async function matchInformationExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	const matcherNode = TsAST.isCallExpression(node) ? DArray.at(node.arguments, 1) : undefined;
	const inputNode = TsAST.isCallExpression(node) ? DArray.first(node.arguments) : undefined;

	// Formes non prises en charge : data-last `matchInformation(matcher)(input)`,
	// matcher qui n'est pas un objet littéral.
	if (!inputNode || !matcherNode || !TsAST.isObjectLiteralExpression(matcherNode)) {
		return context.error(node, "match-information-requires-input-and-object-literal");
	}

	const { typeChecker } = context.transpilation;

	const input = await DCommon.asyncPipe(
		context.transform(inputNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(input)) {
		return input;
	}

	const inputVariable = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: input.result,
	});

	let before: readonly GoAST.Statement[] = DArray.concat(input.before, [inputVariable]);
	let cases: readonly GoAST.ExpressionSwitchCase[] = [];

	const resultIdentifier = context.generateIdentifier();

	for (const property of matcherNode.properties) {
		if (
			!TsAST.isPropertyAssignment(property)
			|| (!TsAST.isIdentifier(property.name) && !TsAST.isStringLiteral(property.name))
		) {
			return context.error(property, "match-information-unsupported-property");
		}

		const callback = await DCommon.asyncPipe(
			context.transform(property.initializer, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(callback)) {
			return callback;
		}

		const callbackVariable = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: callback.result,
		});

		before = DArray.concat(before, callback.before, [callbackVariable]);

		// Le callback reçoit la valeur seulement s'il déclare un paramètre.
		const signature = DArray.first(
			await typeChecker.getSignaturesOfType(
				await typeChecker.getTypeAtLocation(property.initializer),
				SignatureKind.Call,
			),
		);

		if (!signature) {
			return context.error(property.initializer, "match-information-callback-is-not-callable");
		}

		let callArguments: readonly GoAST.Expression[] = [];

		if (signature.parameters.length > 0) {
			let paramTypeRef: GoAST.Type | GoAST.TypeReference | undefined = undefined;

			const parameterType = await DCommon.asyncPipe(
				transformCheckerType(
					await typeChecker.getParameterType(signature, 0),
					property.initializer,
					context,
				),
				DEither.unwrapRight,
			);

			if (!DEither.isLeft(parameterType)) {
				paramTypeRef = parameterType.result;
			} else {
				const eitherType = await typeChecker.getTypeAtLocation(inputNode);
				paramTypeRef = await getEitherRightValueType(eitherType, inputNode, context);
			}

			if (!paramTypeRef) {
				return context.error(property.initializer, "match-information-cannot-determine-parameter-type");
			}

			callArguments = [
				GoAST.createTypeAssertionExpression({
					target: GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target: inputVariable.identifier,
							identifier: getValueMethodIdentifier,
						}),
						arguments: [],
					}),
					typeReference: paramTypeRef,
				}),
			];
		}

		cases = DArray.push(cases, GoAST.createExpressionSwitchCase({
			expressions: DCommon.cast([GoAST.createStringLiteral({ value: property.name.text })]),
			statements: [
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([resultIdentifier]),
					values: DCommon.cast([
						GoAST.createCallExpression({
							callee: callbackVariable.identifier,
							arguments: callArguments,
						}),
					]),
				}),
			],
		}));
	}

	const resultType = await DCommon.asyncPipe(
		transformCheckerType(await typeChecker.getTypeAtLocation(node), node, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(resultType)) {
		return resultType;
	}

	return context.success({
		before: DArray.concat(
			before,
			[
				GoAST.createVariableDeclarationZeroValue({
					identifier: resultIdentifier,
					typeReference: resultType.result,
				}),
				GoAST.createExpressionSwitchStatementWithoutDefault({
					expression: GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target: inputVariable.identifier,
							identifier: getInformationMethodIdentifier,
						}),
						arguments: [],
					}),
					cases,
				}),
			],
		),
		result: resultIdentifier,
	});
}
