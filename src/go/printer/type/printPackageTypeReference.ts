import { type PackageTypeReference } from "../../AST/common";
import { createNodePrinter } from "..";

export const printPackageTypeReference = createNodePrinter<PackageTypeReference>(
	(node, context) => `${context.renderNode(node.packageName)}.${context.renderNode(node.identifier)}`,
);
