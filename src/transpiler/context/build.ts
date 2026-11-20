import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import type * as DObject from "@duplojs/lang/object";
import * as DPath from "@duplojs/lang/path";
import * as DString from "@duplojs/lang/string";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { Symbol } from "typescript/async";
import { transform, type Transformer, type TransformerResultNode, type NotfoundTransformer, type TransformationError, type TransformationNotSupported, type TransformationSuccess, type TransformationSuccessPayload, sharedDependencyImportDeclaration, sharedDependencyPackageName, type SharedDependency } from "@transformer";
import type { FileContext } from "./file";
import type { TranspilationContext } from "./transpilation";
import type * as DArray from "@duplojs/lang/array";
import { resolveDependencyFile, resolveReferenceModule, type DependencyReference, type DependencyFile, type ModuleReference, type ResolvedModuleReference } from "../resolvedReference";

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
	notSupport(): TransformationNotSupported;
	error(node: TsAST.Node, content?: unknown): TransformationError;
	// Crée une variable Go nommée d'après son rôle (`left`, `argument`, `pipeStep`…) suivi d'un
	// numéro : `left1`, `left2`. Le nom reste lisible et ne peut pas entrer en conflit avec un mot-clé Go.
	generateIdentifier(name: string): GoAST.Identifier;
	createSourceIdentifier(value: string): GoAST.Identifier;
	// Nom du paquet Go d'un fichier source, tiré de son chemin dans le projet :
	// `add.ts` → `add_ts`, `lib/math.ts` → `lib_math_ts`.
	createPackageIdentifier(filePath: string & DPath.Absolute): GoAST.Identifier;
	registerSharedDependency(sharedDependency: SharedDependency): GoAST.Identifier;
	resolveDependencyFile(
		reference: DependencyReference | Symbol,
	): Promise<DEither.Maybe<DependencyFile>>;
	resolveReferenceModule(
		reference: ModuleReference,
		moduleName: string,
		entryPattern?: RegExp,
	): Promise<DEither.Maybe<ResolvedModuleReference>>;
	registerDependencyFile(dependencyFile: DependencyFile): GoAST.Identifier;
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
			// Un nœud produit par le checker (`typeToTypeNode`) n'a pas de texte source.
			text: DCommon.pipe(
				DEither.safeCallback(() => node.getText()),
				DEither.whenIsRightOtherwise(
					DCommon.forward,
					() => "DisplayError",
				),
			),
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
			file.dependencyFiles.add(filePath);
			return context.createPackageIdentifier(filePath);
		},
		createPackageIdentifier: (filePath) => DCommon.pipe(
			DPath.computeRelative(transpilation.projectWorkDirectory, filePath),
			// `_` est doublé avant de remplacer `/`, `.` et `-` par `_` : `my_file.ts` (`my__file_ts`)
			// reste distinct de `my/file.ts` (`my_file_ts`).
			DString.replace(/_/g, "__"),
			DString.replace(/[^a-zA-Z0-9_]/g, "_"),
			// Le suffixe `_ts` évite tout conflit avec un paquet Go standard (`math`, `regexp`…).
			// Un identifiant Go ne peut pas commencer par un chiffre : `2026.ts` → `file_2026_ts`.
			(name) => DString.test(name, /^[0-9]/) ? `file_${name}` : name,
			GoAST.createIdentifier,
		),
		generateIdentifier: (name) => {
			// Un nom qui n'est pas un identifiant Go valide (`$value`) est remplacé par `value`.
			const baseName = DString.test(name, /^[A-Za-z_][A-Za-z0-9_]*$/)
				? name
				: "value";
			// Un nom terminé par un chiffre reçoit un séparateur : `left1` + 1 donne `left1_1`,
			// distinct de `left` + 11 (`left11`).
			const separator = DString.test(baseName, /[0-9]$/) ? "_" : "";
			const index = transpilation.nextIndexOf(baseName);

			return GoAST.createIdentifier(`${baseName}${separator}${index}`);
		},
		createSourceIdentifier: (value) => DCommon.pipe(
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
