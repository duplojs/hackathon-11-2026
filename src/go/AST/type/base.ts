import { type _Node } from "../base";

export interface _Type<
	GenericNodeName extends string = string,
> extends _Node<`type-${GenericNodeName}`> {

}
