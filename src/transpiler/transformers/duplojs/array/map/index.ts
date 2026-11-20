import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { evaluateAllToVariables } from "../../../expression/evaluate";
import { transformCheckerType } from "../../../type";
import { getFunctionTypes } from "../../either/members";
import { arrayMapDependency, arrayMapIdentifier, arrayMapWithIdentifier } from "./sharedDependency";

// `DArray.map(array, theFunction)` et sa forme curryfiée `DArray.map(theFunction)`.
// Le callback ne reçoit que l'élément : le second paramètre (`{ index, self }`) n'est pas traduit.
// Un tuple (tableau Go `[N]T`) est parcouru comme une slice (`array[:]`), sans copie : son
// résultat est typé par DuploJS comme un tableau (`readonly U[] & LengthEqual<N>`), donc une slice.
export async function mapExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "map-reference-without-call-not-supported");
	}

	const isCurried = DArray.lengthEqual(node.arguments, 1);

	if (!isCurried && !DArray.lengthEqual(node.arguments, 2)) {
		return context.error(node, "map-expects-one-or-two-arguments");
	}

	const { typeChecker } = context.transpilation;
	const theFunctionNode = node.arguments[node.arguments.length - 1];

	if (theFunctionNode && TsAST.isArrowFunction(theFunctionNode) && theFunctionNode.parameters.length > 1) {
		return context.error(theFunctionNode, "map-callback-params-not-supported");
	}

	const [arrayNode] = node.arguments;
	const callType = await typeChecker.getTypeAtLocation(node);

	const curriedTypes = isCurried
		? await getFunctionTypes(callType, node, context)
		: undefined;

	if (curriedTypes && DEither.isLeft(curriedTypes)) {
		return curriedTypes;
	}

	const curried = curriedTypes && DEither.unwrapRight(curriedTypes);
	const inputType = curried
		? curried.parameters[0]
		: arrayNode && await typeChecker.getTypeAtLocation(arrayNode);

	if (!inputType) {
		return context.error(node, "map-input-not-resolved");
	}

	const inputGoType = await transformCheckerType(inputType, node, context);

	if (DEither.isLeft(inputGoType)) {
		return inputGoType;
	}

	const inputRepresentation = DEither.unwrapRight(inputGoType);
	const isFixedArray = DModeling.hasTagValue(inputRepresentation, "[node][type]array");

	if (!isFixedArray && !DModeling.hasTagValue(inputRepresentation, "[node][type]slice")) {
		return context.error(node, "map-only-supports-arrays");
	}

	const evaluated = await evaluateAllToVariables(node.arguments, context);

	if (DEither.isLeft(evaluated)) {
		return evaluated;
	}

	const { before, identifiers } = DEither.unwrapRight(evaluated);
	const [firstIdentifier, secondIdentifier] = identifiers;
	const theFunction = isCurried ? firstIdentifier : secondIdentifier;

	if (!firstIdentifier || !theFunction) {
		return context.error(node, "map-expects-one-or-two-arguments");
	}

	const shared = (identifier: GoAST.Identifier) => GoAST.createSelectorExpression({
		target: context.registerSharedDependency(arrayMapDependency.value),
		identifier,
	});

	const asSlice = (array: GoAST.Expression) => isFixedArray
		? GoAST.createSliceExpression({ target: array })
		: array;

	if (!curried) {
		return context.success({
			before,
			result: GoAST.createCallExpression({
				callee: shared(arrayMapIdentifier),
				arguments: [asSlice(firstIdentifier), theFunction],
			}),
		});
	}

	if (!isFixedArray) {
		return context.success({
			before,
			result: GoAST.createCallExpression({
				callee: shared(arrayMapWithIdentifier),
				arguments: [theFunction],
			}),
		});
	}

	// Forme curryfiée sur un tuple : la fonction renvoyée reçoit le tableau Go et le voit comme une slice.
	const outputGoType = await transformCheckerType(curried.returnType, node, context);

	if (DEither.isLeft(outputGoType)) {
		return outputGoType;
	}

	const array = context.generateIdentifier("array");

	return context.success({
		before,
		result: GoAST.createFunctionLiteral({
			arguments: [
				GoAST.createFunctionArgument({
					identifier: array,
					type: inputRepresentation,
				}),
			],
			returnTypes: [DEither.unwrapRight(outputGoType)],
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createReturnStatement({
						values: [
							GoAST.createCallExpression({
								callee: shared(arrayMapIdentifier),
								arguments: [asSlice(array), theFunction],
							}),
						],
					}),
				],
			}),
		}),
	});
}
