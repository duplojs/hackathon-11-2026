import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "../..";
import { type AssignmentTarget } from "..";
import { type Identifier } from "../../common";

export interface RangeAssignment extends DModeling.ObjectTagWithGroup<"range-assignment", NodeGroup> {
	key: AssignmentTarget;
	value?: AssignmentTarget;
}

export const createRangeAssignment = DModeling.createTaggedObjectFactory<
	RangeAssignment
>("[node]range-assignment");

export interface RangeDeclaration extends DModeling.ObjectTagWithGroup<"range-declaration", NodeGroup> {
	key: Identifier;
	value?: Identifier;
}

export const createRangeDeclaration = DModeling.createTaggedObjectFactory<
	RangeDeclaration
>("[node]range-declaration");

export type RangeBinding = RangeAssignment | RangeDeclaration;
