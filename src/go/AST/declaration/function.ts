import * as DModeling from "@duplojs/lang/modeling";
import { type BlockStatement } from "../statement";
import { type Identifier, type TypeReference, type GenericTypeReference } from "../common";
import { type FunctionParameter, type TypeParameter, type Type, type PointerType } from "../type";
import { type DeclarationGroup } from "./base";

export type FunctionDeclarationReturnType = (
	| TypeReference
	| Type
);

export type MethodDeclarationReturnType = (
	| TypeReference
	| Type
);

export type MethodReceiverPointerTarget = (
	| Identifier
	| GenericTypeReference
);

export type MethodReceiverType = (
	| Identifier
	| GenericTypeReference
	| PointerType<MethodReceiverPointerTarget>
);

export type MethodReceiver = readonly [identifier: Identifier, typeReference: MethodReceiverType];

export interface FunctionDeclaration extends DModeling.ObjectTagWithGroup<"function", DeclarationGroup> {
	identifier: Identifier;
	generic: readonly TypeParameter[];
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly FunctionDeclarationReturnType[];
	body: BlockStatement;
}

export const createFunctionDeclaration = DModeling.createTaggedObjectFactory<
	FunctionDeclaration
>("[node][declaration]function");

export interface MethodDeclaration extends DModeling.ObjectTagWithGroup<"method", DeclarationGroup> {
	identifier: Identifier;
	receiver: MethodReceiver;
	generic: readonly TypeParameter[];
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly MethodDeclarationReturnType[];
	body: BlockStatement;
}

export const createMethodDeclaration = DModeling.createTaggedObjectFactory<
	MethodDeclaration
>("[node][declaration]method");
