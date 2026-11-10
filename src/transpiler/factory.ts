import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import type * as GO from "@go";
import type * as TS from "typescript/ast";
import type { TransformerContext } from "./context";
import type { LocalTransformerContext } from "./localContext";
import * as DGenerator from "@duplojs/lang/generator";

export interface TransformationSuccessPayload<
	GenericGoNode extends GO.AST.Node,
> {
	result: GenericGoNode;
	before: readonly (
		| GO.AST.Statement
		| GO.AST.LocalDeclaration
	)[];
	topLevelDeclarations: GO.AST.TopLevelDeclaration[];
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
		data: TS.Node,
		context: TransformerContext,
		localContext: LocalTransformerContext,
	): DCommon.MaybePromise<
		| TransformationSuccess<GenericResultNode>
		| TransformationError
		| NotfoundTransformer
		| TransformationNotSupported
	>;
}

export type TransformerResultNode<GenericTransformer extends Transformer> =
	GenericTransformer extends Transformer<infer GenericGoNode>
		? GenericGoNode
		: never;

export function createTransformer<
	GenericResultNode extends GO.AST.Node = never,
>(
	transformer: DCommon.IsNever<GenericResultNode> extends true
		? never
		: (
			data: TS.Node,
			context: TransformerContext,
			localContext: LocalTransformerContext,
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
	data: TS.Node,
	transformers: GenericTransformers,
	context: TransformerContext,
	localContext: LocalTransformerContext,
): Promise<
	| TransformationSuccess<TransformerResultNode<GenericTransformers[number]>>
	| TransformationError
	| NotfoundTransformer
	| TransformationNotSupported
>;
export function transform(
	data: TS.Node,
	transformers: readonly Transformer[],
	context: TransformerContext,
	localContext: LocalTransformerContext,
) {
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
			}) => DEither.matchInformation(
				await item.transformer(data, context, localContext),
				{
					"transformation-not-supported": () => next(lastValue),
					"notfound-transformer": exit,
					"transformation-error": exit,
					"transformation-success": exit,
				},
			),
		),
	);
}
