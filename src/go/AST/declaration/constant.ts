import { createFactory, type Identifier } from "../base";
import { type _Declaration } from "./base";

export type ConstantExpression = (
	never
);

export interface ConstantDeclaration extends _Declaration<"constant"> {
	identifier: Identifier;
	typeReference?: Identifier;
	initializer: ConstantExpression;
}

export const constantDeclaration = createFactory<
	ConstantDeclaration
>("node-declaration-constant");
