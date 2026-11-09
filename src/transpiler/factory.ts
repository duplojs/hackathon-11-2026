import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import type * as GO from "@go";
import type { TransformerContext } from "./context";
import type { LocalTransformerContext } from "./localContext";

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

export type NotfoundTransformer = DEither.Left<
	"notfound-transformer",
	unknown
>;

export interface Transformer<
	GenericData extends unknown = unknown,
	GenericResultNode extends GO.AST.Node = GO.AST.Node,
> extends DModeling.ObjectTag<"Transformer"> {
	predicate(input: unknown): input is GenericData;
	transformer(
		data: GenericData,
		context: TransformerContext,
		localContext: LocalTransformerContext,
	): DCommon.MaybePromise<
		| TransformationSuccess<GenericResultNode>
		| TransformationError
		| NotfoundTransformer
	>;
}

export type TransformerResultNode<GenericTransformer extends Transformer> =
	GenericTransformer extends Transformer<unknown, infer GenericGoNode>
		? GenericGoNode
		: never;

export function createTransformer<
	GenericData extends unknown,
	GenericResultNode extends GO.AST.Node,
>(
	predicate: (input: unknown) => input is GenericData,
	transformer: (
		data: NoInfer<GenericData>,
		context: TransformerContext,
		localContext: LocalTransformerContext,
	) => DCommon.MaybePromise<
		| TransformationSuccess<GenericResultNode>
		| TransformationError
		| NotfoundTransformer
	>,
): Transformer<
	GenericData,
	GenericResultNode
> {
	return DModeling.taggedObject(
		"Transformer",
		{
			predicate,
			transformer,
		},
	);
}

export function transform<
	GenericTransformers extends readonly Transformer[],
>(
	data: unknown,
	transformers: GenericTransformers,
	context: TransformerContext,
	localContext: LocalTransformerContext,
): Promise<
		| TransformationSuccess<TransformerResultNode<GenericTransformers[number]>>
		| TransformationError
		| NotfoundTransformer
>;
export async function transform(
	data: unknown,
	transformers: readonly Transformer[],
	context: TransformerContext,
	localContext: LocalTransformerContext,
) {
	return DCommon.pipe(
		transformers,
		DArray.reduce(
			DArray.reduceFrom<NotfoundTransformer>(
				DEither.left("notfound-transformer", data),
			),
			({
				element,
				lastValue,
				next,
				exit,
			}) => {
				if (!element.predicate(data)) {
					return next(lastValue);
				}

				return exit(
					element.transformer(
						data,
						context,
						localContext,
					),
				);
			},
		),
	);
}
