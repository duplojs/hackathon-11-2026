import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createEitherDependency } from "../createEitherDependency";

export const rightFunctionIdentifier = GoAST.createIdentifier("EitherRightOf");
export const rightTypeIdentifier = GoAST.createIdentifier("EitherRight");

// `DEither.right(information, value)` : une réussite nommée par son information.
export const eitherRightDependency = DCommon.memo(() => createEitherDependency({
	typeIdentifier: rightTypeIdentifier,
	functionIdentifier: rightFunctionIdentifier,
	kinds: ["right"],
}));
