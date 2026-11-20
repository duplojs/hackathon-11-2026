import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import type { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { eitherConstructorExpressionHandler, eitherConstructorTypeHandler, type EitherConstructor } from "../constructor";
import { eitherErrorDependency, errorFunctionIdentifier, errorTypeIdentifier } from "./sharedDependency";

const errorConstructor: EitherConstructor = {
	dependency: () => eitherErrorDependency.value,
	typeIdentifier: errorTypeIdentifier,
	functionIdentifier: errorFunctionIdentifier,
	hasInformation: false,
};

// `DEither.error(value)` : un `Left` d'information `"error"`.
export function errorExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	return eitherConstructorExpressionHandler(node, context, errorConstructor);
}

// `Error<Value>`.
export function errorTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	return eitherConstructorTypeHandler(node, context, errorConstructor, 0);
}
