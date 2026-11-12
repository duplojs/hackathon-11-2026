import { type GoFile } from "../AST/common";
import { renderNode } from "./renderNode";

export function printGoFile(file: GoFile) {
	return renderNode(file);
}
