import type * as DCommon from "@duplojs/lang/common";
import type * as DKind from "@duplojs/lang/kind";
import * as DModeling from "@duplojs/lang/modeling";

export interface _Node<
	GenericNodeName extends string = string,
> extends DModeling.ObjectTag<`node-${GenericNodeName}`> {

}

export function createFactory<
	GenericTaggedObject extends DModeling.ObjectTag = never,
>(
	tag: (
		& DModeling.GetTagValue<GenericTaggedObject>
		& DCommon.ForbiddenUnion<GenericTaggedObject>
	),
) {
	return (
		properties: DCommon.SimplifyTopLevel<
			DKind.Remove<
				GenericTaggedObject
			>
		>,
	): GenericTaggedObject => ({
		...properties,
		[DModeling.objectTagKind.runTimeKey]: tag,
	}) as never;
}
