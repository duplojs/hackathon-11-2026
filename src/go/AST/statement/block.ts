import { createFactory } from "../base";
import { type _Statement, type Statement } from "./base";

export interface BlockStatement extends _Statement<"block"> {
	statements: readonly Statement[];
}

export const blockStatement = createFactory<BlockStatement>(
	"node-statement-block",
);
