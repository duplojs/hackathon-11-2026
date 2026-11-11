import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import type * as GO from "@go";
import type { BuildContext } from "./context/build";
import * as DGenerator from "@duplojs/lang/generator";
import type * as DArray from "@duplojs/lang/array";

export interface TransformationSuccessPayload<
	GenericGoNode extends GO.AST.Node,
> {
	result: GenericGoNode;
	before: readonly (
		| GO.AST.Statement
		| GO.AST.LocalDeclaration
	)[];
}

export type TransformationSuccess<
	GenericGoNode extends GO.AST.Node,
> = DEither.Right<
	"transformation-success",
	TransformationSuccessPayload<GenericGoNode>
>;

export type TransformationError = DEither.Left<
	"transformation-error",
	unknown
>;

export type TransformationNotSupported = DEither.Left<
	"transformation-not-supported",
	unknown
>;

export type NotfoundTransformer = DEither.Left<
	"notfound-transformer",
	unknown
>;

export interface Transformer<
	GenericResultNode extends GO.AST.Node = GO.AST.Node,
> extends DModeling.ObjectTag<"Transformer"> {
	transformer(
		data: unknown,
		context: BuildContext,
	): DCommon.MaybePromise<
		| TransformationSuccess<GenericResultNode>
		| TransformationError
		| NotfoundTransformer
		| TransformationNotSupported
	>;
}

export type TransformerResultNode<
	GenericTransformer extends Transformer,
> = DEither.GetValue<
	Extract<
		Awaited<ReturnType<GenericTransformer["transformer"]>>,
		TransformationSuccess<GO.AST.Node>
	>
>["result"];

export function createTransformer<
	GenericResultNode extends GO.AST.Node = never,
>(
	transformer: DCommon.IsNever<GenericResultNode> extends true
		? never
		: (
			data: unknown,
			context: BuildContext,
		) => DCommon.MaybePromise<
			| TransformationSuccess<NoInfer<GenericResultNode>>
			| TransformationError
			| NotfoundTransformer
			| TransformationNotSupported
		>,
): Transformer<
	GenericResultNode
> {
	return DModeling.taggedObject(
		"Transformer",
		{
			transformer,
		},
	);
}

export function transform<
	GenericTransformers extends readonly Transformer[],
>(
	data: unknown,
	transformers: GenericTransformers,
	context: BuildContext,
): Promise<
	| TransformationSuccess<TransformerResultNode<DArray.Unwrap<GenericTransformers>>>
	| TransformationError
	| NotfoundTransformer
> {
	return DCommon.pipe(
		transformers,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<NotfoundTransformer>(
				DEither.left("notfound-transformer", data),
			),
			async({
				item,
				lastValue,
				next,
				exit,
			}) => DCommon.asyncPipe(
				item.transformer(data, context),
				DEither.whenHasInformationOtherwise(
					"transformation-not-supported",
					() => next(lastValue),
					exit,
				),
			),
		),
	);
}
