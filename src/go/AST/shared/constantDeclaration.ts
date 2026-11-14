import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type StatementGroup } from "../statement";
import { type Identifier, type TypeReference } from "../common";
import { type ConstantExpression } from "../expression";
import { type DeclarationGroup } from "../declaration";

export type { ConstantExpression } from "../expression";

export interface ConstantDeclaration extends DModeling.ObjectTagWithGroup<
	"constant",
	[NodeGroup, DeclarationGroup, StatementGroup]
> {
	identifier: Identifier;
	typeReference?: TypeReference;
	initializer: ConstantExpression;
}

export const createConstantDeclaration = DModeling.createTaggedObjectFactory<
	ConstantDeclaration
>("[node][declaration][statement]constant");
