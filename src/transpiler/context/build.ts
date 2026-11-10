import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import type * as DObject from "@duplojs/lang/object";
import * as DString from "@duplojs/lang/string";
import * as GO from "@go";
import type * as TS from "typescript/ast";
import { transform, type Transformer, type TransformerResultNode, type NotfoundTransformer, type TransformationError, type TransformationNotSupported, type TransformationSuccess, type TransformationSuccessPayload } from "../factory";
import type { FileContext } from "./file";
import type { TranspilationContext } from "./transpilation";

export interface BuildContext {
	readonly transpilation: TranspilationContext;
	readonly file: FileContext;
	transform<GenericTransformers extends readonly Transformer[]>(
		data: TS.Node,
		transformers: GenericTransformers,
	): Promise<
		| TransformationSuccess<TransformerResultNode<GenericTransformers[number]>>
		| TransformationError
		| NotfoundTransformer
	>;
	success<GenericGoNode extends GO.AST.Node>(
		payload: DObject.PartialKeys<
			TransformationSuccessPayload<GenericGoNode>,
			"before" | "topLevelDeclarations"
		>
	): TransformationSuccess<GenericGoNode>;
	notSupport(content: unknown): TransformationNotSupported;
	error(content: unknown): TransformationError;
	createIdentifier(): GO.AST.Identifier;
	createSourceIdentifier(value: string): GO.AST.Identifier;
}

export function createBuildContext(
	transpilation: TranspilationContext,
	file: FileContext,
) {
	const context: BuildContext = {
		transpilation,
		file,
		transform: (data, transformers) => transform(data, transformers, context),
		error: (content) => DEither.left("transformation-error", content),
		success: (payload) => DEither.right("transformation-success", {
			...payload,
			before: payload.before ?? [],
			topLevelDeclarations: payload.topLevelDeclarations ?? [],
		}),
		notSupport: (content) => DEither.left("transformation-not-supported", content),
		createIdentifier() {
			return GO.AST.createIdentifier(`Generated_${transpilation.increment()}`);
		},
		createSourceIdentifier(value) {
			return DCommon.pipe(
				value,
				DString.replace(
					/[^a-zA-Z0-9]/g,
					({ matchedValue }) => DCommon.pipe(
						matchedValue.charCodeAt(0).toString(36),
						DString.padStart(4, "0"),
					),
				),
				DString.prepend("Duplojs_"),
				GO.AST.createIdentifier,
			);
		},
	};

	return context;
}
