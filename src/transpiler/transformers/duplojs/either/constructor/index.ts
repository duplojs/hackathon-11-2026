import { type Transformer, type SharedDependency } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { callExpressionTransformer } from "../../../shared";
import { typeTransformers } from "../../../type";
import { getExpectedEitherType } from "../expectedType";
import { eitherDependency } from "../sharedDependency";

/** Un constructeur DuploJS (success, fail, left) et sa fonction Go. */
export interface EitherConstructor {
	readonly functionIdentifier: GoAST.Identifier;
	readonly dependency: SharedDependency;

	/** success : 1, fail : 0, left : 2. */
	readonly argumentCount: number;
}

/**
 * success, fail, left : même recette. Renvoie la fonction Go instanciée avec
 * [L, R], sinon Go refuse de la ranger dans une variable.
 */
export async function eitherConstructorExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
	constructor: EitherConstructor,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (TsAST.isCallExpression(node)) {
		return context.transform(node, [callExpressionTransformer]);
	}

	const call = node.parent;

	if (!call || !TsAST.isCallExpression(call) || call.expression !== node) {
		// Passé comme valeur : non géré.
		return context.error(node, "either-constructor-used-as-value");
	}

	if (call.arguments.length !== constructor.argumentCount) {
		// Ex. `left("x")` sans valeur.
		return context.error(call, "either-constructor-arguments-not-supported");
	}

	const { typeChecker } = context.transpilation;
	const expectedType = await getExpectedEitherType(call, context);
	const expectedTypeNode = await typeChecker.typeToTypeNode(expectedType, call);

	if (!expectedTypeNode) {
		return context.error(call, "either-constructor-unknown-expected-type");
	}

	const eitherType = await DCommon.asyncPipe(
		context.transform(expectedTypeNode, typeTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(eitherType)) {
		return eitherType;
	}

	if (!DModeling.hasTagValue(eitherType.result, "[node]type-reference-generic")) {
		return context.error(call, "either-constructor-expected-type-is-not-either");
	}

	context.registerSharedDependency(eitherDependency.value);
	const packageName = context.registerSharedDependency(constructor.dependency);

	return context.success({
		before: eitherType.before,
		result: GoAST.createInstantiationExpression({
			target: GoAST.createSelectorExpression({
				target: packageName,
				identifier: constructor.functionIdentifier,
			}),
			typeArguments: eitherType.result.typeArguments,
		}),
	});
}
