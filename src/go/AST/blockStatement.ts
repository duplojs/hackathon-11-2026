import { createFactory, type _Node } from "./base";

type Statement = (
	never
);

export interface BlockStatement extends _Node<"block-statement"> {
	statements: Statement[];
}

export const blockStatement = createFactory<BlockStatement>(
	"node-block-statement",
);
