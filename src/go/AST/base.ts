import type * as DModeling from "@duplojs/lang/modeling";

export interface _Node<
	GenericNodeName extends string = string,
> extends DModeling.ObjectTag<`node-${GenericNodeName}`> {

}
