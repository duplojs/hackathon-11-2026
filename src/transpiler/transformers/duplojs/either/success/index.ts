import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { transformCallExpression } from "../../../shared";
import { eitherDependency, eitherSuccessFunctionIdentifier } from "../sharedDependency";
import { resolveExpectedEitherValueType } from "../expectedValueType";
import { createEitherConstructorCall } from "../constructor";

export async function successExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (TsAST.isCallExpression(node)) {
		return createEitherConstructorCall(node, "success", context);
	}

	const packageName = context.registerSharedDependency(eitherDependency.value);

	return context.success({
		result: GoAST.createSelectorExpression({
			target: packageName,
			identifier: eitherSuccessFunctionIdentifier,
		}),
	});
}
