import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import type * as DObject from "@duplojs/lang/object";
import * as GO from "@go";
import type { Checker } from "typescript/async";
import type * as TS from "typescript/ast";
import type { SharedDependency } from "./sharedDependency";
import type { LocalTransformerContext } from "./localContext";
import { transform, type Transformer, type TransformerResultNode, type TransformationSuccessPayload, type TransformationSuccess, type TransformationError, type NotfoundTransformer, type TransformationNotSupported } from "./factory";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

export interface TopLevelContext {
	readonly imports: readonly GO.AST.ImportDeclaration[];
	readonly topLevelDeclarations: readonly GO.AST.TopLevelDeclaration[];
	push(...nodes: readonly (GO.AST.ImportDeclaration | GO.AST.TopLevelDeclaration)[]): void;
}

export interface SharedDependencyContext {
	readonly imports: readonly GO.AST.ImportDeclaration[];
	readonly topLevelDeclarations: readonly GO.AST.TopLevelDeclaration[];
	push(sharedDependency: SharedDependency): void;
}

export interface MainContext extends TopLevelContext {
	readonly statements: readonly GO.AST.Statement[];
	pushStatements(...nodes: readonly GO.AST.Statement[]): void;
}

export interface TransformerContext {
	checker: Checker;
	main: MainContext;
	sharedDependencies: SharedDependencyContext;
	transform<GenericTransformers extends readonly Transformer[]>(
		data: TS.Node,
		transformers: GenericTransformers,
		localContext: LocalTransformerContext,
	): Promise<
		| TransformationSuccess<TransformerResultNode<GenericTransformers[number]>>
		| TransformationError
		| NotfoundTransformer
		| TransformationNotSupported
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

function createTopLevelContext() {
	let imports: readonly GO.AST.ImportDeclaration[] = [];
	let topLevelDeclarations: readonly GO.AST.TopLevelDeclaration[] = [];

	return {
		get imports() {
			return imports;
		},
		get topLevelDeclarations() {
			return topLevelDeclarations;
		},
		push(...nodes: readonly (GO.AST.ImportDeclaration | GO.AST.TopLevelDeclaration)[]) {
			const grouped = DArray.group(
				nodes,
				(node, { output }) => DModeling.hasTagValue(node, "node-declaration-import")
					? output("imports", node)
					: output("topLevelDeclarations", node),
			);

			imports = [...imports, ...grouped.imports ?? []];
			topLevelDeclarations = [...topLevelDeclarations, ...grouped.topLevelDeclarations ?? []];
		},
	};
}

function createSharedDependencyContext() {
	const topLevelContext = createTopLevelContext();
	let names: readonly string[] = [];

	return {
		get imports() {
			return topLevelContext.imports;
		},
		get topLevelDeclarations() {
			return topLevelContext.topLevelDeclarations;
		},
		push(sharedDependency: SharedDependency) {
			if (DArray.includes(names, sharedDependency.name)) {
				return;
			}

			names = DArray.push(names, sharedDependency.name);
			topLevelContext.push(...sharedDependency.imports, ...sharedDependency.topLevelDeclarations);
		},
	};
}

function createMainContext() {
	const topLevelContext = createTopLevelContext();
	let statements: readonly GO.AST.Statement[] = [];

	return {
		get imports() {
			return topLevelContext.imports;
		},
		get topLevelDeclarations() {
			return topLevelContext.topLevelDeclarations;
		},
		push: topLevelContext.push,
		get statements() {
			return statements;
		},
		pushStatements(...nodes: readonly GO.AST.Statement[]) {
			statements = [...statements, ...nodes];
		},
	};
}

export function createTransformerContext(checker: Checker) {
	let identifierIndex = 0;

	const context: TransformerContext = {
		checker,
		main: createMainContext(),
		sharedDependencies: createSharedDependencyContext(),
		error: (content) => DEither.left("transformation-error", content),
		success: (payload) => DEither.right("transformation-success", {
			...payload,
			before: payload.before ?? [],
			topLevelDeclarations: payload.topLevelDeclarations ?? [],
		}),
		notSupport: (content) => DEither.left("transformation-not-supported", content),
		transform: (data, transformers, localContext) => transform(data, transformers, context, localContext),
		createIdentifier() {
			identifierIndex += 1;

			return GO.AST.createIdentifier(`Generated_${identifierIndex}`);
		},
		createSourceIdentifier(value) {
			return DCommon.pipe(
				value,
				DString.replace(
					/[^a-zA-Z0-9]/g,
					({ matchedValue }) => matchedValue
						.charCodeAt(0)
						.toString(36)
						.padStart(4, "0"),
				),
				DString.prepend("Duplojs_"),
				GO.AST.createIdentifier,
			);
		},
	};

	return context;
}
