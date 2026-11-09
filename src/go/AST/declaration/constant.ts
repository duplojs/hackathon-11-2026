import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type ConstantExpression } from "../expression/constant";
import { type TypeReference } from "../type/reference";
import { type _Declaration } from "./base";

export type { ConstantExpression } from "../expression/constant";

export interface ConstantDeclaration extends _Declaration<"constant"> {
	identifier: Identifier;
	typeReference?: TypeReference;
	initializer: ConstantExpression;
}

export const constantDeclaration = createFactory<
	ConstantDeclaration
>("node-declaration-constant");
