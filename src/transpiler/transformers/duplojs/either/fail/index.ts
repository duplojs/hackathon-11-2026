import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import type { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { eitherFailDependency, failFunctionIdentifier, failTypeIdentifier } from "./sharedDependency";

export function failTypeHandler(
	_node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	return context.success({
		result: GoAST.createPackageTypeReference({
			packageName: context.registerSharedDependency(eitherFailDependency.value),
			identifier: failTypeIdentifier,
		}),
	});
}

export async function failExpressionHandler(
	_node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const packageName = context.registerSharedDependency(eitherFailDependency.value);

	return context.success({
		result: GoAST.createCallExpression({
			callee: GoAST.createSelectorExpression({
				target: packageName,
				identifier: failFunctionIdentifier,
			}),
			arguments: [],
		}),
	});
}
