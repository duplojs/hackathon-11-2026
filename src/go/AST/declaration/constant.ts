import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type TypeReference } from "../type/reference";
import { type _Declaration } from "./base";

// Il manque une expression constante : cette famille reste à définir.
export type ConstantExpression = (
	never
);

export interface ConstantDeclaration extends _Declaration<"constant"> {
	identifier: Identifier;
	typeReference?: TypeReference;
	initializer: ConstantExpression;
}

export const constantDeclaration = createFactory<
	ConstantDeclaration
>("node-declaration-constant");
