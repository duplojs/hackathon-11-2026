import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import type * as DObject from "@duplojs/lang/object";
import * as DPath from "@duplojs/lang/path";
import * as DString from "@duplojs/lang/string";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { Symbol } from "typescript/async";
import { describeNodeLocation, getNodeText } from "../createTransformer";
import { transform, type Transformer, type TransformerResultNode, type NotfoundTransformer, type TransformationError, type TransformationNotSupported, type TransformationSuccess, type TransformationSuccessPayload, sharedDependencyImportDeclaration, sharedDependencyPackageName, type SharedDependency } from "@transformer";
import type { FileContext } from "./file";
import type { TranspilationContext } from "./transpilation";
import type * as DArray from "@duplojs/lang/array";
import { resolveDependencyFile, resolveReferenceModule, type DependencyReference, type DependencyFile, type ModuleReference, type ResolvedModuleReference } from "../resolvedReference";
import { isMergedPackage } from "../moduleGraph";
import { createFileKey } from "../sourcePackage";

export type { DependencyReference } from "../resolvedReference";

export function createSourcePackageIdentifier(
	filePath: string & DPath.Absolute,
	projectWorkDirectory: string & DPath.Absolute,
) {
	const relativePath = DPath.computeRelative(projectWorkDirectory, filePath);
	const pathWithoutExtension = DCommon.pipe(
		relativePath,
		DString.replace(/\.tsx?$/, ""),
	);
	const identifier = DCommon.pipe(
		pathWithoutExtension,
		DString.replace(
			/[^a-zA-Z0-9]/g,
			({ matchedValue }) => DCommon.pipe(
				matchedValue.charCodeAt(0).toString(16),
				DString.padStart(4, "0"),
				(code) => `_${code}_`,
			),
		),
		DString.prepend("Sourced_"),
	);

	return GoAST.createIdentifier(identifier);
}

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
	notSupport(): TransformationNotSupported;
	error(node: TsAST.Node, content?: unknown): TransformationError;
	generateIdentifier(): GoAST.Identifier;
	createSourceIdentifier(value: string): GoAST.Identifier;
	registerSharedDependency(sharedDependency: SharedDependency): GoAST.Identifier;
	resolveDependencyFile(
		reference: DependencyReference | Symbol,
	): Promise<DEither.Maybe<DependencyFile>>;
	resolveReferenceModule(
		reference: ModuleReference,
		moduleName: string,
		entryPattern?: RegExp,
	): Promise<DEither.Maybe<ResolvedModuleReference>>;

	/**
	 * Package Go qui contient `dependencyFile`, à préfixer devant ses membres ;
	 * `undefined` quand il est dans le même package que le fichier courant
	 * (cycle d'imports fusionné) : aucun import, aucun préfixe.
	 */
	registerDependencyFile(dependencyFile: DependencyFile): GoAST.Identifier | undefined;

	/**
	 * Nom Go d'une déclaration de PREMIER NIVEAU (`name`) du fichier `filePath`.
	 * Hors cycle : `Sourced_<name>` (inchangé). Dans un package fusionné, plusieurs
	 * fichiers partagent la même portée Go : le nom porte la clé du fichier.
	 */
	createTopLevelIdentifier(filePath: string & DPath.Absolute, name: string): GoAST.Identifier;
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
			kind: TsAST.SyntaxKind[node.kind],
			parentKind: node.parent ? TsAST.SyntaxKind[node.parent.kind] : undefined,
			location: describeNodeLocation(node, file.sourceFile),
			text: getNodeText(node),
			getNode: () => node,
			content,
			filePath: file.currentFilePath,
			projectWorkDirectory: transpilation.projectWorkDirectory,
		}),
		success: (payload) => DEither.right("transformation-success", {
			...payload,
			before: payload.before ?? [],
		}),
		notSupport: () => DEither.left("transformation-not-supported", undefined),
		registerSharedDependency: (sharedDependency) => {
			transpilation.sharedDependencies.add(sharedDependency);
			file.imports.add(sharedDependencyImportDeclaration);

			return sharedDependencyPackageName;
		},
		resolveDependencyFile: (reference) => resolveDependencyFile(reference, context),
		resolveReferenceModule: (reference, moduleName, entryPattern) => resolveReferenceModule(
			reference,
			context,
			moduleName,
			entryPattern,
		),
		registerDependencyFile: ({ filePath }) => {
			const { packageOf } = transpilation.moduleGraph;
			const dependencyPackage = packageOf.get(filePath) ?? filePath;
			const currentPackage = packageOf.get(file.currentFilePath) ?? file.currentFilePath;

			if (dependencyPackage === currentPackage) {
				return undefined;
			}

			file.dependencyFiles.add(filePath);
			return createSourcePackageIdentifier(dependencyPackage, transpilation.projectWorkDirectory);
		},
		createTopLevelIdentifier: (filePath, name) => {
			const identifier = context.createSourceIdentifier(name);

			return isMergedPackage(transpilation.moduleGraph, filePath)
				? GoAST.createIdentifier(
					`${identifier.value}__${createFileKey(transpilation.projectWorkDirectory, filePath)}`,
				)
				: identifier;
		},
		generateIdentifier: () => GoAST.createIdentifier(`Generated_${transpilation.increment()}`),
		createSourceIdentifier: (value) => value === file.currentFilePath
			? createSourcePackageIdentifier(
				transpilation.moduleGraph.packageOf.get(file.currentFilePath) ?? file.currentFilePath,
				transpilation.projectWorkDirectory,
			)
			: DCommon.pipe(
				value,
				DString.replace(
					/[^a-zA-Z0-9_]/g,
					({ matchedValue }) => DCommon.pipe(
						matchedValue.charCodeAt(0).toString(36),
						DString.padStart(4, "0"),
					),
				),
				DString.prepend("Sourced_"),
				GoAST.createIdentifier,
			),
	};

	return context;
}
