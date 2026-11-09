import { type PackageTypeReference } from "../../AST/type/reference";
import { createNodePrinter } from "../createNodePrinter";

export const printPackageTypeReference = createNodePrinter<PackageTypeReference>(
	(node, context) => `${context.renderNode(node.packageName)}.${context.renderNode(node.identifier)}`,
);
