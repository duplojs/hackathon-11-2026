import { type TypeParameter } from "../../AST/type";
import { type PrinterContext, renderNodeList } from "..";

// Spécification Go (« Type parameter declarations ») : avec UN SEUL paramètre P dont
// la contrainte C est telle que « P C » forme une expression valide (`[P *C]`,
// `[P *C|Q]`, `[P (C)]`), `type T[P *C] …` se lirait comme un tableau de longueur
// P*C. La virgule finale (`[P *C,]`) lève l'ambiguïté. Dans tous les autres cas, on
// imprime la forme usuelle, sans virgule : `[V any]`, `[To any, From any]` (D13).
function needsTrailingComma(parameters: readonly TypeParameter[], context: PrinterContext) {
	const [parameter] = parameters;

	if (!parameter || parameters.length !== 1) {
		return false;
	}

	const constraint = context.renderNode(parameter.constraint);

	return constraint.startsWith("*") || constraint.startsWith("(");
}

export function renderTypeParameters(parameters: readonly TypeParameter[], context: PrinterContext) {
	if (parameters.length === 0) {
		return "";
	}

	const trailingComma = needsTrailingComma(parameters, context) ? "," : "";

	return `[${renderNodeList(parameters, context)}${trailingComma}]`;
}
