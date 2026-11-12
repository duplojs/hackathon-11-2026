import { type Identifier, type TypeReference } from "../common";
import { type CallExpression } from "./call";
import { type UnaryExpression, type BinaryExpression } from "./operator";
import { type SelectorExpression } from "./access";
import { type ConversionExpression } from "./conversion";
import { type ConstantLiteral } from "./literal";

// Les noms et appels peuvent désigner des constantes ou des built-ins constants.
// Leur résolution et la valeur constante du résultat relèvent du compilateur Go.
export type ConstantExpression = (
	| Identifier
	| ConstantLiteral
	| SelectorExpression<Identifier>
	| UnaryExpression<ConstantExpression>
	| BinaryExpression<ConstantExpression>
	| ConversionExpression<TypeReference, ConstantExpression>
	| CallExpression<Identifier | SelectorExpression<Identifier>>
);
