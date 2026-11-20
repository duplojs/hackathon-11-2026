import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { transformCallExpression } from "../../../shared";
import { eitherDependency, eitherLeftFunctionIdentifier } from "../sharedDependency";
import { resolveExpectedEitherValueType } from "../expectedValueType";
import { createEitherConstructorCall } from "../constructor";

// DEither.left(information, value) : EitherLeftOf[V](information, value), V tiré
// du TYPE ATTENDU (union englobante, retour de fonction même inféré), comme fail()
// et success() : `Left<"negative-operand", number> | Success<number>` donne
// Either[float64]. Les deux arguments sont évalués dans l'ordre JS.
export async function leftExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "duplojs-either-left-as-value-not-supported");
	}

	// left(information) sans valeur : value vaudrait undefined, non couvert ici.
	if (!DArray.lengthEqual(node.arguments, 2)) {
		return context.error(node, "duplojs-either-left-two-arguments-only");
	}

	return createEitherConstructorCall(node, "left", context);
}
