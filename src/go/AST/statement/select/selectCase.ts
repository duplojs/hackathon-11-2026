import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "../..";
import { type Statement, type SendStatement } from "..";
import { type SelectReceiveAssignment, type SelectReceiveDeclaration } from "./selectReceive";
import { type ReceiveExpression } from "../../expression";

export type SelectCommunication = (
	| SendStatement
	| ReceiveExpression
	| SelectReceiveAssignment
	| SelectReceiveDeclaration
);

export interface SelectCase extends DModeling.ObjectTagWithGroup<"select-case", NodeGroup> {
	communication: SelectCommunication;
	statements: readonly Statement[];
}

export const selectCase = DModeling.createTaggedObjectFactory<
	SelectCase
>("[node]select-case");
