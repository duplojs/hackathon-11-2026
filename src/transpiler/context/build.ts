import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import type * as DObject from "@duplojs/lang/object";
import * as DString from "@duplojs/lang/string";
import { GoAST } from "@go";
import type { TsAST } from "@typescript";
import type { Symbol } from "typescript/async";
import { transform, type Transformer, type TransformerResultNode, type NotfoundTransformer, type TransformationError, type TransformationNotSupported, type TransformationSuccess, type TransformationSuccessPayload, sharedDependencyImportDeclaration, sharedDependencyPackageName, type SharedDependency } from "@transformer";
import type { FileContext } from "./file";
import type { TranspilationContext } from "./transpilation";
import * as DPath from "@duplojs/lang/path";
import type * as DArray from "@duplojs/lang/array";
import { resolveReference, resolveReferenceModule, type DependencyReference, type ResolvedReference, type ResolvedModuleReference } from "../resolvedReference";

export type { DependencyReference } from "../resolvedReference";

export interface BuildContext {
	readonly transpilation: TranspilationContext;
	readonly file: FileContext;
	transform<
		GenericTransformers extends readonly Transformer[],
	>(
		data: TsAST.Node,
		transformers: GenericTransformers,
	): Promise<
		| TransformationSuccess<TransformerResultNode<DArray.Unwrap<GenericTransformers>>>
		| TransformationError
		| NotfoundTransformer
	>;
	success<GenericGoNode extends GoAST.Node>(
		payload: DObject.PartialKeys<
			TransformationSuccessPayload<GenericGoNode>,
			"before"
		>
	): TransformationSuccess<GenericGoNode>;
	notSupport(content?: unknown): TransformationNotSupported;
	error(node: TsAST.Node, content?: unknown): TransformationError;
	generateIdentifier(): GoAST.Identifier;
	createSourceIdentifier(value: string): GoAST.Identifier;
	registerSharedDependency(sharedDependency: SharedDependency): GoAST.Identifier;
	resolveReference(
		reference: DependencyReference | Symbol,
	): Promise<DEither.Maybe<ResolvedReference>>;
	resolveReferenceModule(
		reference: DependencyReference | Symbol,
		moduleName: string,
		entryPattern?: RegExp,
	): Promise<DEither.Maybe<ResolvedModuleReference>>;
	registerDependency(reference: ResolvedReference): DEither.Maybe<GoAST.Identifier>;
}

export function createBuildContext(
	transpilation: TranspilationContext,
	file: FileContext,
) {
	const context: BuildContext = {
		transpilation,
		file,
		transform: (data, transformers) => transform(data, transformers, context),
		error: (node, content) => DEither.left("transformation-error", {
			node,
			content,
			filePath: file.currentFilePath,
			projectWorkDirectory: transpilation.projectWorkDirectory,
		}),
		success: (payload) => DEither.right("transformation-success", {
			...payload,
			before: payload.before ?? [],
		}),
		notSupport: (content) => DEither.left("transformation-not-supported", {
			content,
			filePath: file.currentFilePath,
			projectWorkDirectory: transpilation.projectWorkDirectory,
		}),
		registerSharedDependency: (sharedDependency) => {
			transpilation.sharedDependencies.add(sharedDependency);
			file.imports.add(sharedDependencyImportDeclaration);

			return sharedDependencyPackageName;
		},
		resolveReference: (reference) => resolveReference(
			reference,
			transpilation.typeChecker,
			transpilation.projectWorkDirectory,
		),
		resolveReferenceModule: (reference, moduleName, entryPattern) => resolveReferenceModule(
			reference,
			transpilation.typeChecker,
			moduleName,
			entryPattern,
		),
		registerDependency: (reference) => {
			const path = reference.symbol.valueDeclaration?.path;

			if (!path) {
				return DEither.none();
			}

			const currentDependencyFilePath = DCommon.pipe(
				path,
				DPath.createAbsolute,
				DEither.unwrapRight,
			);

			if (DEither.isLeft(currentDependencyFilePath)) {
				return DEither.none();
			}

			if (currentDependencyFilePath === file.currentFilePath) {
				return DEither.none();
			}

			file.dependencyFiles.add(currentDependencyFilePath);
			return DEither.some(
				context.createSourceIdentifier(currentDependencyFilePath),
			);
		},
		generateIdentifier: () => GoAST.createIdentifier(`Generated_${transpilation.increment()}`),
		createSourceIdentifier: (value) => DCommon.pipe(
			value,
			DString.replace(
				/[^a-zA-Z0-9_]/g,
				({ matchedValue }) => DCommon.pipe(
					matchedValue.charCodeAt(0).toString(36),
					DString.padStart(4, "0"),
				),
			),
			DString.prepend("Duplojs_"),
			GoAST.createIdentifier,
		),
	};

	return context;
}
