import * as DModeling from "@duplojs/lang/modeling";
import { type _Statement, type Statement } from "./base";

export interface BlockStatement extends _Statement<"block"> {
	statements: readonly Statement[];
}

export const blockStatement = DModeling.createTaggedObjectFactory<BlockStatement>(
	"node-statement-block",
);
