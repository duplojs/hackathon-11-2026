import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import type * as DObject from "@duplojs/lang/object";
import type * as GO from "@go";

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

export interface TransformerContext {
	transform: typeof transform;
	success<
		GenericGoNode extends GO.AST.Node,
	>(
		payload: DObject.PartialKeys<
			TransformationSuccessPayload<GenericGoNode>,
			"before" | "topLevelDeclarations"
		>
	): TransformationSuccess<GenericGoNode>;
	error(content: unknown): TransformationError;
}

export interface Transformer<
	GenericData extends unknown = unknown,
	GenericResultNode extends GO.AST.Node = GO.AST.Node,
> extends DModeling.ObjectTag<"Transformer"> {
	predicate(input: unknown): input is GenericData;
	transformer(
		data: GenericData,
		context: TransformerContext,
	): (
		| TransformationSuccess<GenericResultNode>
		| TransformationError
		| NotfoundTransformer
	);
}

export function createTransformer<
	GenericData extends unknown,
	GenericResultNode extends GO.AST.Node,
>(
	predicate: (input: unknown) => input is GenericData,
	transformer: (
		data: NoInfer<GenericData>,
		context: TransformerContext,
	) => (
		| TransformationSuccess<GenericResultNode>
		| TransformationError
		| NotfoundTransformer
	),
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

const transformerContext: TransformerContext = {
	error: (content) => DEither.left("transformation-error", content),
	success: (payload) => DEither.right("transformation-success", {
		...payload,
		before: payload.before ?? [],
		topLevelDeclarations: payload.topLevelDeclarations ?? [],
	}),
	transform,
};

export function transform<
	GenericGoNode extends GO.AST.Node,
>(
	data: unknown,
	transformers: readonly Transformer<unknown, GenericGoNode>[],
): (
		| TransformationSuccess<GenericGoNode>
		| TransformationError
		| NotfoundTransformer
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
						transformerContext,
					),
				);
			},
		),
	);
}
