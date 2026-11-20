import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import type { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { eitherConstructorExpressionHandler, eitherConstructorTypeHandler, type EitherConstructor } from "../constructor";
import { eitherLeftDependency, leftFunctionIdentifier, leftTypeIdentifier } from "./sharedDependency";

const leftConstructor: EitherConstructor = {
	dependency: () => eitherLeftDependency.value,
	typeIdentifier: leftTypeIdentifier,
	functionIdentifier: leftFunctionIdentifier,
	hasInformation: true,
};

// `DEither.left(information, value?)` : un échec identifié par son information et portant son
// contexte. Sans valeur, la valeur est `undefined`, comme dans DuploJS.
export function leftExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	return eitherConstructorExpressionHandler(node, context, leftConstructor);
}

// `Left<Information, Value>` : l'information devient une chaîne, seul le type de la valeur paramètre la struct Go.
export function leftTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	return eitherConstructorTypeHandler(node, context, leftConstructor, 1);
}
