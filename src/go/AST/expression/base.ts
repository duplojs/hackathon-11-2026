import { type _Node } from "../base";

export interface _Expression<
	GenericNodeName extends string = string,
> extends _Node<`expression-${GenericNodeName}`> {

}
