import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type Identifier, type TypeReference } from "../common";
import { type Type } from "../type";
import { type ExpressionGroup } from "./base";
import { type SelectorExpression } from "./access";

export type InstantiationTarget = Identifier | SelectorExpression<Identifier>;

export type InstantiationTypeArgument = TypeReference | Type;

export interface InstantiationExpression extends DModeling.ObjectTagWithGroup<"instantiation", ExpressionGroup> {
	target: InstantiationTarget;
	typeArguments: readonly InstantiationTypeArgument[] & DArray.MinElements<1>;
}

export const instantiationExpression = DModeling.createTaggedObjectFactory<
	InstantiationExpression
>("[node][expression]instantiation");
