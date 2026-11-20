import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { transformCallExpression } from "../../../shared";
import { eitherDependency, eitherFailFunctionIdentifier } from "../sharedDependency";
import { resolveExpectedEitherValueType } from "../expectedValueType";
import { createEitherConstructorCall } from "../constructor";

export async function failExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	// fail utilisé comme valeur (passé à une fonction) : relève de l'ADR-3.
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	// fail() n'a pas d'argument : le type vient du type attendu (C11, ADR-13).
	return createEitherConstructorCall(node, "fail", context);
}
