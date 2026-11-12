import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type Expression, type ExpressionGroup } from "../expression";
import { type StatementGroup } from "../statement";

export interface ReceiveExpression extends DModeling.ObjectTagWithGroup<
	"receive",
	[NodeGroup, ExpressionGroup[1], StatementGroup[1]]
> {
	operand: Expression;
}

export const createReceiveExpression = DModeling.createTaggedObjectFactory<
	ReceiveExpression
>("[node][expression][statement]receive");
