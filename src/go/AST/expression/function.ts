import * as DModeling from "@duplojs/lang/modeling";
import { type BlockStatement } from "../statement";
import { type TypeReference } from "../common";
import { type FunctionParameter, type Type } from "../type";
import { type ExpressionGroup } from "./base";

export type FunctionLiteralReturnType = TypeReference | Type;

export interface FunctionLiteral extends DModeling.ObjectTagWithGroup<"literal-function", ExpressionGroup> {
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly FunctionLiteralReturnType[];
	body: BlockStatement;
}

export const functionLiteral = DModeling.createTaggedObjectFactory<
	FunctionLiteral
>("[node][expression]literal-function");
