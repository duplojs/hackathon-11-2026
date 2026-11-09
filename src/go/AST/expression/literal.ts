import { createFactory } from "../base";
import { type _Expression } from "./base";

export type ConstantLiteral = (
	| IntegerLiteral
	| FloatLiteral
	| ImaginaryLiteral
	| RuneLiteral
	| StringLiteral
	| BooleanLiteral
);

export type Literal = ConstantLiteral | NilLiteral;

export interface IntegerLiteral extends _Expression<"literal-integer"> {
	value: bigint;
}

export const integerLiteral = createFactory<
	IntegerLiteral
>("node-expression-literal-integer");

export interface FloatLiteral extends _Expression<"literal-float"> {
	// Écriture Go du nombre, conservée sans arrondi JavaScript.
	value: string;
}

export const floatLiteral = createFactory<
	FloatLiteral
>("node-expression-literal-float");

export interface ImaginaryLiteral extends _Expression<"literal-imaginary"> {
	// Écriture Go du coefficient, sans le suffixe i.
	value: string;
}

export const imaginaryLiteral = createFactory<
	ImaginaryLiteral
>("node-expression-literal-imaginary");

export interface RuneLiteral extends _Expression<"literal-rune"> {
	// Un caractère Unicode décodé ; le printer ajoute les quotes et échappements.
	value: string;
}

export const runeLiteral = createFactory<
	RuneLiteral
>("node-expression-literal-rune");

export type StringLiteralMode = "text" | "bytes";

export interface StringLiteral extends _Expression<"literal-string"> {
	mode?: StringLiteralMode;
	// Mode absent ou text : texte Unicode que le printer encode en UTF-8.
	// bytes : chaque caractère de code 0 à 255 représente directement un octet.
	// Dans les deux modes, le printer ajoute les guillemets et les échappements Go.
	value: string;
}

export const stringLiteral = createFactory<
	StringLiteral
>("node-expression-literal-string");

export interface BooleanLiteral extends _Expression<"literal-boolean"> {
	value: boolean;
}

export const booleanLiteral = createFactory<
	BooleanLiteral
>("node-expression-literal-boolean");

export interface NilLiteral extends _Expression<"literal-nil"> {

}

export const nilLiteral = createFactory<
	NilLiteral
>("node-expression-literal-nil");
