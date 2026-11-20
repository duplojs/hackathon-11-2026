import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../context/build";
import { evaluateAllToVariables } from "../../expression/evaluate";
import { createFunctionValue } from "../functionValue";

export type CreateStringCall = (goArguments: readonly GoAST.Expression[]) => GoAST.Expression;

// Fonction `DString` simple : appelée avec tous ses arguments (`DString.length(value)`), ou passée
// en valeur (`pipe(value, DString.length)`), auquel cas elle devient une fonction Go typée.
// La forme curryfiée (moins d'arguments) n'est pas traduite.
export async function stringCallHandler(
	node: TsAST.Node,
	context: BuildContext,
	arity: number,
	createCall: CreateStringCall,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return createFunctionValue(
			node,
			context,
			async(parameters) => DArray.lengthEqual(parameters, arity)
				? DEither.success({ result: createCall(DArray.map(parameters, ({ identifier }) => identifier)) })
				: context.error(node, "string-function-value-arity-not-supported"),
		);
	}

	if (!DArray.lengthEqual(node.arguments, arity)) {
		return context.error(node, "string-function-curried-form-not-supported");
	}

	const evaluated = await evaluateAllToVariables(node.arguments, context);

	if (DEither.isLeft(evaluated)) {
		return evaluated;
	}

	const { before, identifiers } = DEither.unwrapRight(evaluated);

	return context.success({
		before,
		result: createCall(identifiers),
	});
}
