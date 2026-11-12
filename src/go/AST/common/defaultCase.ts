import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type Statement } from "../statement";

export interface DefaultCase extends DModeling.ObjectTagWithGroup<"case-default", NodeGroup> {
	statements: readonly Statement[];
}

export const defaultCase = DModeling.createTaggedObjectFactory<
	DefaultCase
>("[node]case-default");
