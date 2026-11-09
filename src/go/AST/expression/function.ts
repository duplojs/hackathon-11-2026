import * as DModeling from "@duplojs/lang/modeling";
import { type BlockStatement } from "../statement/block";
import { type Type } from "../type/base";
import { type FunctionParameter } from "../type/function";
import { type TypeReference } from "../type/reference";
import { type _Expression } from "./base";

export type FunctionLiteralReturnType = TypeReference | Type;

export interface FunctionLiteral extends _Expression<"literal-function"> {
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly FunctionLiteralReturnType[];
	body: BlockStatement;
}

export const functionLiteral = DModeling.createTaggedObjectFactory<
	FunctionLiteral
>("node-expression-literal-function");
