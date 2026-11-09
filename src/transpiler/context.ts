import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import type * as DObject from "@duplojs/lang/object";
import * as GO from "@go";
import type { Checker } from "typescript/async";
import type { ConstantDependency } from "./dependency";
import type { LocalTransformerContext } from "./localContext";
import {
	transform,
	type Transformer,
	type TransformerResultNode,
	type TransformationSuccessPayload,
	type TransformationSuccess,
	type TransformationError,
	type NotfoundTransformer,
} from "./factory";

export interface TopLevelContext {
	readonly imports: readonly GO.AST.ImportDeclaration[];
	readonly topLevelDeclarations: readonly GO.AST.TopLevelDeclaration[];
	push(...nodes: readonly (GO.AST.ImportDeclaration | GO.AST.TopLevelDeclaration)[]): void;
}

export interface DependencyContext {
	readonly imports: readonly GO.AST.ImportDeclaration[];
	readonly topLevelDeclarations: readonly GO.AST.TopLevelDeclaration[];
	push(dependency: ConstantDependency): void;
}

export interface TransformerContext {
	checker: Checker;
	main: TopLevelContext;
	dependencies: DependencyContext;
	transform<GenericTransformers extends readonly Transformer[]>(
		data: unknown,
		transformers: GenericTransformers,
		localContext: LocalTransformerContext,
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
	error(content: unknown): TransformationError;
	createIdentifier(): GO.AST.Identifier;
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
			for (const node of nodes) {
				if (DModeling.hasTagValue(node, "node-declaration-import")) {
					imports = DArray.push(imports, node);
				} else {
					topLevelDeclarations = DArray.push(topLevelDeclarations, node);
				}
			}
		},
	};
}

function createDependencyContext() {
	const topLevelContext = createTopLevelContext();
	let names: readonly string[] = [];

	return {
		get imports() {
			return topLevelContext.imports;
		},
		get topLevelDeclarations() {
			return topLevelContext.topLevelDeclarations;
		},
		push(dependency: ConstantDependency) {
			if (DArray.includes(names, dependency.name)) {
				return;
			}

			names = DArray.push(names, dependency.name);
			topLevelContext.push(...dependency.imports, ...dependency.topLevelDeclarations);
		},
	};
}

export function createTransformerContext(checker: Checker) {
	let identifierIndex = 0;

	const context: TransformerContext = {
		checker,
		main: createTopLevelContext(),
		dependencies: createDependencyContext(),
		error: (content) => DEither.left("transformation-error", content),
		success: (payload) => DEither.right("transformation-success", {
			...payload,
			before: payload.before ?? [],
			topLevelDeclarations: payload.topLevelDeclarations ?? [],
		}),
		transform: (data, transformers, localContext) => transform(data, transformers, context, localContext),
		createIdentifier() {
			identifierIndex += 1;

			return GO.AST.createIdentifier(`generated_${identifierIndex}`);
		},
	};

	return context;
}
