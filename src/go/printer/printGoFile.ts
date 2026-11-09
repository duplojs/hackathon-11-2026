import { type GoFile } from "../AST/file";
import { renderNode } from "./renderNode";

export function printGoFile(file: GoFile) {
	return renderNode(file);
}
