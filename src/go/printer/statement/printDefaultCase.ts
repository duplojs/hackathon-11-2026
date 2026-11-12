import { type DefaultCase } from "../../AST/common";
import { createNodePrinter } from "..";
import { renderCaseBody } from "./renderCaseBody";

export const printDefaultCase = createNodePrinter<DefaultCase>(
	(node, context) => renderCaseBody("default", node.statements, context),
);
