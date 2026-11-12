import * as DModeling from "@duplojs/lang/modeling";
import { type ExpressionGroup } from "./base";

export type ConstantLiteral = (
	| IntegerLiteral
	| FloatLiteral
	| ImaginaryLiteral
	| RuneLiteral
	| StringLiteral
	| BooleanLiteral
);

export type Literal = ConstantLiteral | NilLiteral;

export interface IntegerLiteral extends DModeling.ObjectTagWithGroup<"literal-integer", ExpressionGroup> {
	value: bigint;
}

export const integerLiteral = DModeling.createTaggedObjectFactory<
	IntegerLiteral
>("[node][expression]literal-integer");

export interface FloatLiteral extends DModeling.ObjectTagWithGroup<"literal-float", ExpressionGroup> {
	// Écriture Go du nombre, conservée sans arrondi JavaScript.
	value: string;
}

export const floatLiteral = DModeling.createTaggedObjectFactory<
	FloatLiteral
>("[node][expression]literal-float");

export interface ImaginaryLiteral extends DModeling.ObjectTagWithGroup<"literal-imaginary", ExpressionGroup> {
	// Écriture Go du coefficient, sans le suffixe i.
	value: string;
}

export const imaginaryLiteral = DModeling.createTaggedObjectFactory<
	ImaginaryLiteral
>("[node][expression]literal-imaginary");

export interface RuneLiteral extends DModeling.ObjectTagWithGroup<"literal-rune", ExpressionGroup> {
	// Un caractère Unicode décodé ; le printer ajoute les quotes et échappements.
	value: string;
}

export const runeLiteral = DModeling.createTaggedObjectFactory<
	RuneLiteral
>("[node][expression]literal-rune");

export type StringLiteralMode = "text" | "bytes";

export interface StringLiteral extends DModeling.ObjectTagWithGroup<"literal-string", ExpressionGroup> {
	mode?: StringLiteralMode;
	// Mode absent ou text : texte Unicode que le printer encode en UTF-8.
	// bytes : chaque caractère de code 0 à 255 représente directement un octet.
	// Dans les deux modes, le printer ajoute les guillemets et les échappements Go.
	value: string;
}

export const stringLiteral = DModeling.createTaggedObjectFactory<
	StringLiteral
>("[node][expression]literal-string");

export interface BooleanLiteral extends DModeling.ObjectTagWithGroup<"literal-boolean", ExpressionGroup> {
	value: boolean;
}

export const booleanLiteral = DModeling.createTaggedObjectFactory<
	BooleanLiteral
>("[node][expression]literal-boolean");

export interface NilLiteral extends DModeling.ObjectTagWithGroup<"literal-nil", ExpressionGroup> {

}

export const nilLiteral = DModeling.createTaggedObjectFactory<
	NilLiteral
>("[node][expression]literal-nil");
