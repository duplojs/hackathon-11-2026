import * as DModeling from "@duplojs/lang/modeling";
import { type BlockStatement } from "../statement";
import { type TypeReference, type FunctionArgument } from "../common";
import { type Type } from "../type";
import { type ExpressionGroup } from "./base";

export type FunctionLiteralReturnType = TypeReference | Type;

export interface FunctionLiteral extends DModeling.ObjectTagWithGroup<"literal-function", ExpressionGroup> {
	arguments: readonly FunctionArgument[];
	variadicArgument?: FunctionArgument;
	returnTypes: readonly FunctionLiteralReturnType[];
	body: BlockStatement;
}

export const createFunctionLiteral = DModeling.createTaggedObjectFactory<
	FunctionLiteral
>("[node][expression]literal-function");
