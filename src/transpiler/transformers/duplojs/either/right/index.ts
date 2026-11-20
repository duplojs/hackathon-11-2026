import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import type { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { eitherConstructorExpressionHandler, eitherConstructorTypeHandler, type EitherConstructor } from "../constructor";
import { eitherRightDependency, rightFunctionIdentifier, rightTypeIdentifier } from "./sharedDependency";

const rightConstructor: EitherConstructor = {
	dependency: () => eitherRightDependency.value,
	typeIdentifier: rightTypeIdentifier,
	functionIdentifier: rightFunctionIdentifier,
	hasInformation: true,
};

// `DEither.right(information, value)` : une réussite nommée (`"valid-username"`).
export function rightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	return eitherConstructorExpressionHandler(node, context, rightConstructor);
}

// `Right<Information, Value>`.
export function rightTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	return eitherConstructorTypeHandler(node, context, rightConstructor, 1);
}
