import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier } from "../identifier";
import { type Type } from "../type/base";
import { type FunctionParameter, type TypeParameter } from "../type/function";
import { type PointerType } from "../type/pointer";
import { type GenericTypeReference, type TypeReference } from "../type/reference";
import { type BlockStatement } from "../statement/block";
import { type _Declaration } from "./base";

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

export interface FunctionDeclaration extends _Declaration<"function"> {
	identifier: Identifier;
	generic: readonly TypeParameter[];
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly FunctionDeclarationReturnType[];
	body: BlockStatement;
}

export const functionDeclaration = DModeling.createTaggedObjectFactory<
	FunctionDeclaration
>("[node][declaration]:function");

export interface MethodDeclaration extends _Declaration<"method"> {
	identifier: Identifier;
	receiver: MethodReceiver;
	generic: readonly TypeParameter[];
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly MethodDeclarationReturnType[];
	body: BlockStatement;
}

export const methodDeclaration = DModeling.createTaggedObjectFactory<
	MethodDeclaration
>("[node][declaration]:method");
