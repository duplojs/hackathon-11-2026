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

	/** `fichier:ligne:colonne` du nœud, ou du site réel pour un nœud synthétique. */
	readonly location?: string;
	readonly parentKind: string | undefined;
	readonly text: string;
	getNode(): TsAST.Node;
	readonly content: unknown;
}

export interface NotfoundTransformerPayload extends TransformationDiagnosticContext {
	readonly kind: string;
	readonly location?: string;
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

/**
 * Texte d'un nœud pour un diagnostic. Un nœud SYNTHÉTIQUE (produit par
 * typeToTypeNode) n'a pas de texte source : getText() lève une exception ou lit
 * un autre fichier à la même position (D21). On l'indique au lieu de l'inventer.
 */
export function getNodeText(node: TsAST.Node) {
	if (node.pos < 0 || node.end < 0) {
		return `<nœud synthétique ${TsAST.SyntaxKind[node.kind]}>`;
	}

	try {
		return node.getText();
	} catch {
		return `<nœud synthétique ${TsAST.SyntaxKind[node.kind]}>`;
	}
}

/** `chemin:ligne:colonne` (base 1) d'un nœud du fichier courant ; sinon undefined. */
export function describeNodeLocation(node: TsAST.Node, sourceFile: TsAST.SourceFile) {
	if (node.pos < 0) {
		return undefined;
	}

	try {
		if (node.getSourceFile() !== sourceFile) {
			return undefined;
		}

		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

		return `${sourceFile.fileName}:${line + 1}:${character + 1}`;
	} catch {
		return undefined;
	}
}

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
				location: describeNodeLocation(data, context.file.sourceFile),
				text: getNodeText(data),
				getNode: () => data,
				filePath: context.file.currentFilePath,
				projectWorkDirectory: context.transpilation.projectWorkDirectory,
			}),
		),
	);
}
