import type * as DArray from "@duplojs/lang/array";
import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type Type } from "../type/base";
import { type TypeReference } from "../type/reference";
import { type SelectorExpression } from "./access";
import { type _Expression } from "./base";

export type InstantiationTarget = Identifier | SelectorExpression<Identifier>;

export type InstantiationTypeArgument = TypeReference | Type;

export interface InstantiationExpression extends _Expression<"instantiation"> {
	target: InstantiationTarget;
	typeArguments: readonly InstantiationTypeArgument[] & DArray.MinElements<1>;
}

export const instantiationExpression = createFactory<
	InstantiationExpression
>("node-expression-instantiation");
