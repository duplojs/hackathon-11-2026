import { type DefaultCase } from "../../AST/statement/switch";
import { createNodePrinter } from "../createNodePrinter";
import { renderCaseBody } from "./renderCaseBody";

export const printDefaultCase = createNodePrinter<DefaultCase>(
	(node, context) => renderCaseBody("default", node.statements, context),
);
