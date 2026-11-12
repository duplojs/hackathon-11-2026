import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "../..";
import { type AssignmentTarget } from "..";
import { type Identifier } from "../../common";
import { type ReceiveExpression } from "../../expression";

export interface SelectReceiveAssignment extends DModeling.ObjectTagWithGroup<"select-receive-assignment", NodeGroup> {
	value: AssignmentTarget;
	ok?: AssignmentTarget;
	receive: ReceiveExpression;
}

export const selectReceiveAssignment = DModeling.createTaggedObjectFactory<
	SelectReceiveAssignment
>("[node]select-receive-assignment");

export interface SelectReceiveDeclaration extends DModeling.ObjectTagWithGroup<"select-receive-declaration", NodeGroup> {
	value: Identifier;
	ok?: Identifier;
	receive: ReceiveExpression;
}

export const selectReceiveDeclaration = DModeling.createTaggedObjectFactory<
	SelectReceiveDeclaration
>("[node]select-receive-declaration");
