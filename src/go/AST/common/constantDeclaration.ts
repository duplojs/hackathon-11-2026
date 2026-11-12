import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type StatementGroup } from "../statement";
import { type Identifier } from "./identifier";
import { type TypeReference } from "./typeReference";
import { type ConstantExpression } from "../expression";
import { type DeclarationGroup } from "../declaration";

export type { ConstantExpression } from "../expression";

export interface ConstantDeclaration extends DModeling.ObjectTagWithGroup<
	"constant",
	[NodeGroup, DeclarationGroup[1], StatementGroup[1]]
> {
	identifier: Identifier;
	typeReference?: TypeReference;
	initializer: ConstantExpression;
}

export const constantDeclaration = DModeling.createTaggedObjectFactory<
	ConstantDeclaration
>("[node][declaration][statement]constant");
