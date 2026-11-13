import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { BuildContext } from "./context/build";
import * as DGenerator from "@duplojs/lang/generator";
import type * as DArray from "@duplojs/lang/array";
import type * as DPath from "@duplojs/lang/path";

export interface TransformationSuccessPayload<
	GenericGoNode extends GoAST.Node = GoAST.Node,
> {
	result: GenericGoNode;
	before: readonly GoAST.Statement[];
}

export type TransformationSuccess<
	GenericGoNode extends GoAST.Node = GoAST.Node,
> = DEither.Right<
	"transformation-success",
	TransformationSuccessPayload<GenericGoNode>
>;

export interface TransformationDiagnosticContext {
	readonly filePath: string & DPath.Absolute;
	readonly projectWorkDirectory: string & DPath.Absolute;
}

export interface TransformationErrorPayload extends TransformationDiagnosticContext {
	readonly kind: string;
	readonly parentKind: string | undefined;
	readonly text: string;
	getNode(): TsAST.Node;
	readonly content: unknown;
}

export interface NotfoundTransformerPayload extends TransformationDiagnosticContext {
	readonly kind: string;
	readonly parentKind: string | undefined;
	readonly text: string;
	getNode(): TsAST.Node;
}

export type TransformationError = DEither.Left<
	"transformation-error",
	TransformationErrorPayload
>;

export type TransformationNotSupported = DEither.Left<
	"transformation-not-supported",
	undefined
>;

export type NotfoundTransformer = DEither.Left<
	"notfound-transformer",
	NotfoundTransformerPayload
>;

export interface Transformer<
	GenericResultNode extends GoAST.Node = GoAST.Node,
> extends DModeling.ObjectTag<"Transformer"> {
	transformer(
		data: TsAST.Node,
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
		TransformationSuccess<GoAST.Node>
	>
>["result"];

export function createTransformer<
	GenericResultNode extends GoAST.Node = never,
>(
	transformer: DCommon.IsNever<GenericResultNode> extends true
		? never
		: (
			data: TsAST.Node,
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
	data: TsAST.Node,
	transformers: GenericTransformers,
	context: BuildContext,
): Promise<
	| TransformationSuccess<TransformerResultNode<DArray.Unwrap<GenericTransformers>>>
	| TransformationError
	| NotfoundTransformer
> {
	return DCommon.asyncPipe(
		transformers,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<TransformationNotSupported>(
				context.notSupport(),
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
		DEither.whenHasInformation(
			"transformation-not-supported",
			() => DEither.left("notfound-transformer", {
				kind: TsAST.SyntaxKind[data.kind],
				parentKind: data.parent ? TsAST.SyntaxKind[data.parent.kind] : undefined,
				text: DCommon.pipe(
					DEither.safeCallback(() => data.getText()),
					DEither.whenIsRightOtherwise(
						DCommon.forward,
						() => "DisplayError",
					),
				),
				getNode: () => data,
				filePath: context.file.currentFilePath,
				projectWorkDirectory: context.transpilation.projectWorkDirectory,
			}),
		),
	);
}
