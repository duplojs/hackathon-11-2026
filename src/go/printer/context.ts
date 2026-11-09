import { type Node } from "../AST/base";

// Les fragments n'ajoutent ni indentation initiale ni saut de ligne final.
// Le paragraphe parent indente toutes les lignes des enfants rendus à profondeur zéro.
export interface PrinterContext {
	readonly depth: number;
	readonly indentation: string;
	renderNode(node: Node, depth?: number): string;
}
