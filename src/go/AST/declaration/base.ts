import { type _Node } from "../base";

export interface _Declaration<
	GenericNodeName extends string = string,
> extends _Node<`declaration-${GenericNodeName}`> {

}
