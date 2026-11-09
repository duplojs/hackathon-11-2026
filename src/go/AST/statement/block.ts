import { createFactory, type _Node } from "../base";
import { type _Statement } from "./base";

type Statement = (
	never
);

export interface BlockStatement extends _Statement<"block"> {
	statements: Statement[];
}

export const blockStatement = createFactory<BlockStatement>(
	"node-statement-block",
);
