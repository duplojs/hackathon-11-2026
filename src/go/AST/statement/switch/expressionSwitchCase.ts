import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type NodeGroup } from "../..";
import { type Statement } from "..";
import { type Expression } from "../../expression";

export interface ExpressionSwitchCase extends DModeling.ObjectTagWithGroup<"switch-case-expression", NodeGroup> {
	expressions: readonly Expression[] & DArray.MinElements<1>;
	statements: readonly Statement[];
}

export const expressionSwitchCase = DModeling.createTaggedObjectFactory<
	ExpressionSwitchCase
>("[node]switch-case-expression");
