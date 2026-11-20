import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createEitherDependency } from "../createEitherDependency";

export const errorFunctionIdentifier = GoAST.createIdentifier("EitherErrorOf");
export const errorTypeIdentifier = GoAST.createIdentifier("EitherError");

// `DEither.error(value)` : un `Left` d'information `"error"`, marqué comme erreur.
export const eitherErrorDependency = DCommon.memo(() => createEitherDependency({
	typeIdentifier: errorTypeIdentifier,
	functionIdentifier: errorFunctionIdentifier,
	kinds: ["left", "error"],
	fixedInformation: "error",
}));
