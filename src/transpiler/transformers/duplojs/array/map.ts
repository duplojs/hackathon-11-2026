import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type Transformer } from "@transformer";
import { type BuildContext } from "../../../context/build";
import { expressionTransformers } from "../../expression";
import { goTypeOfExpression } from "../../type/goTypeOf";
import {
	callbackApplication,
	createFunctionValue,
	resolveCallback,
	type Callback,
	type CallbackApplicationResult,
	type TypedExpression,
} from "../application";

const makeIdentifier = GoAST.createIdentifier("make");
const lenIdentifier = GoAST.createIdentifier("len");

/**
 * DArray.map(arr, f) inliné (PLAN §0.6) :
 *   out := make([]R, len(arr))
 *   for i, v := range arr { out[i] = f(v) }
 * Taille pré-allouée, ordre conservé, f appelé une fois par élément dans l'ordre.
 * R est le type Go produit par le callback (fonction inlinée ou valeur).
 * Un callback qui lit son 2e paramètre (`{ index, self }`) n'est pas pris en charge.
 */
async function buildMap(params: {
	array: TypedExpression;
	callback: Callback;
	site: TsAST.Node;
	context: BuildContext;
}): Promise<CallbackApplicationResult> {
	const { array, callback, site, context } = params;

	if (!DModeling.hasTagValue(array.goType, "[node][type]slice")) {
		return context.error(site, "duplojs-array-map-input-is-not-a-slice");
	}

	if (callback.arity > 1) {
		return context.error(site, "duplojs-array-map-callback-params-not-supported");
	}

	const index = context.generateIdentifier();
	const element = context.generateIdentifier();
	const output = context.generateIdentifier();

	const application = DEither.unwrapRight(
		await callback.apply([
			{
				expression: element,
				goType: array.goType.elementType,
			},
		]),
	);

	if (DEither.isLeft(application)) {
		return application;
	}

	const outputType = GoAST.createSliceType({ elementType: application.goType });

	return callbackApplication({
		before: [
			GoAST.createShortVariableDeclarationStatement({
				identifier: output,
				initializer: GoAST.createCallExpression({
					callee: makeIdentifier,
					arguments: [
						// make reçoit un TYPE en 1er argument : le printer rend tout nœud.
						outputType as unknown as GoAST.Expression,
						GoAST.createCallExpression({
							callee: lenIdentifier,
							arguments: [array.expression],
						}),
					],
				}),
			}),
			GoAST.createRangeStatement({
				binding: GoAST.createRangeDeclaration({
					key: index,
					value: callback.arity === 0 ? undefined : element,
				}),
				expression: array.expression,
				body: GoAST.createBlockStatement({
					statements: [
						...application.before,
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([
								GoAST.createIndexExpression({
									target: output,
									index,
								}),
							]),
							values: DCommon.cast([application.expression]),
						}),
					],
				}),
			}),
		],
		expression: output,
		goType: outputType,
	});
}

async function directHandler(
	node: TsAST.CallExpression,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const [arrayNode, callbackNode] = node.arguments;

	if (!arrayNode || !callbackNode) {
		return context.error(node, "duplojs-array-map-missing-arguments");
	}

	const array = DEither.unwrapRight(await context.transform(arrayNode, expressionTransformers.value));

	if (DEither.isLeft(array)) {
		return array;
	}

	const arrayGoType = DEither.unwrapRight(await goTypeOfExpression(arrayNode, context));

	if (DEither.isLeft(arrayGoType)) {
		return arrayGoType;
	}

	// arr est lu deux fois (len, range) : une seule évaluation.
	const arrayBinding = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: array.result,
	});

	const callback = DEither.unwrapRight(await resolveCallback(callbackNode, context));

	if (DEither.isLeft(callback)) {
		return callback;
	}

	const mapped = DEither.unwrapRight(
		await buildMap({
			array: {
				expression: arrayBinding.identifier,
				goType: arrayGoType.result,
			},
			callback,
			site: node,
			context,
		}),
	);

	if (DEither.isLeft(mapped)) {
		return mapped;
	}

	return context.success({
		before: [...array.before, arrayBinding, ...callback.before, ...mapped.before],
		result: mapped.expression,
	});
}

async function curriedHandler(
	node: TsAST.CallExpression,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const [callbackNode] = node.arguments;

	if (!callbackNode) {
		return context.error(node, "duplojs-array-map-missing-callback");
	}

	const callback = DEither.unwrapRight(await resolveCallback(callbackNode, context));

	if (DEither.isLeft(callback)) {
		return callback;
	}

	const functionValue = DEither.unwrapRight(
		await createFunctionValue({
			site: node,
			context,
			body: async(parameters) => {
				const array = DArray.first(parameters);

				return array
					? buildMap({
						array,
						callback,
						site: node,
						context,
					})
					: context.error(node, "missing-curried-map-parameter");
			},
		}),
	);

	if (DEither.isLeft(functionValue)) {
		return functionValue;
	}

	return context.success({
		before: callback.before,
		result: functionValue.result,
	});
}

export async function mapExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "duplojs-array-map-as-value-not-supported");
	}

	if (DArray.lengthEqual(node.arguments, 2)) {
		return directHandler(node, context);
	}

	if (DArray.lengthEqual(node.arguments, 1)) {
		return curriedHandler(node, context);
	}

	return context.error(node, "duplojs-array-map-unexpected-arity");
}
