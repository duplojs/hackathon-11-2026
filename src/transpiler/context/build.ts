import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import type * as DObject from "@duplojs/lang/object";
import * as DString from "@duplojs/lang/string";
import * as GO from "@go";
import * as TS from "typescript/ast";
import { SymbolFlags } from "typescript/async";
import { transform, type Transformer, type TransformerResultNode, type NotfoundTransformer, type TransformationError, type TransformationNotSupported, type TransformationSuccess, type TransformationSuccessPayload } from "../factory";
import type { FileContext } from "./file";
import type { TranspilationContext } from "./transpilation";
import { sharedDependencyImportDeclaration, sharedDependencyPackageName, type SharedDependency } from "../sharedDependency";
import * as DPath from "@duplojs/lang/path";
import type * as DArray from "@duplojs/lang/array";

export type DependencyReference =
	| TS.Identifier
	| TS.QualifiedName
	| TS.PropertyAccessExpression
	| TS.ElementAccessExpression;

export interface BuildContext {
	readonly transpilation: TranspilationContext;
	readonly file: FileContext;
	transform<
		GenericTransformers extends readonly Transformer[],
	>(
		data: TS.Node,
		transformers: GenericTransformers,
	): Promise<
		| TransformationSuccess<TransformerResultNode<DArray.Unwrap<GenericTransformers>>>
		| TransformationError
		| NotfoundTransformer
	>;
	success<GenericGoNode extends GO.AST.Node>(
		payload: DObject.PartialKeys<
			TransformationSuccessPayload<GenericGoNode>,
			"before"
		>
	): TransformationSuccess<GenericGoNode>;
	notSupport(content: unknown): TransformationNotSupported;
	error(content: unknown): TransformationError;
	generateIdentifier(): GO.AST.Identifier;
	createSourceIdentifier(value: string): GO.AST.Identifier;
	useShardDependency(sharedDependency: SharedDependency, identifier: GO.AST.Identifier): GO.AST.SelectorExpression;
	registerDependency(node: DependencyReference): Promise<DEither.Maybe<GO.AST.Identifier>>;
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
		}),
		notSupport: (content) => DEither.left("transformation-not-supported", content),
		useShardDependency: (sharedDependency, identifier) => {
			transpilation.sharedDependencies.add(sharedDependency);
			file.imports.add(sharedDependencyImportDeclaration);

			return GO.AST.selectorExpression({
				identifier: identifier,
				target: sharedDependencyPackageName,
			});
		},
		registerDependency: async(node) => {
			const symbol = TS.isIdentifier(node) && TS.isShorthandPropertyAssignment(node.parent)
				? await transpilation.typeChecker.getShorthandAssignmentValueSymbol(node.parent)
				: await transpilation.typeChecker.getSymbolAtLocation(node);

			if (!symbol) {
				return DEither.none();
			}

			const resolved = symbol.flags & SymbolFlags.Alias
				? await transpilation.typeChecker.getAliasedSymbol(symbol)
				: symbol;

			if (await transpilation.typeChecker.isUnknownSymbol(resolved)) {
				return DEither.none();
			}

			const path = resolved.valueDeclaration?.path;

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
		generateIdentifier: () => GO.AST.createIdentifier(`Generated_${transpilation.increment()}`),
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
			GO.AST.createIdentifier,
		),
	};

	return context;
}
