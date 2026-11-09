import { type _Node } from "../base";

export interface _Statement<
	GenericNodeName extends string = string,
> extends _Node<`statement-${GenericNodeName}`> {

}
