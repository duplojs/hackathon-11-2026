import { type Identifier } from "../identifier";
import { type TypeReference } from "../type/reference";
import { type SelectorExpression } from "./access";
import { type CallExpression } from "./call";
import { type ConversionExpression } from "./conversion";
import { type ConstantLiteral } from "./literal";
import { type BinaryExpression, type UnaryExpression } from "./operator";

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
