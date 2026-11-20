// whenIsRight avec une fonction utilisateur non générique en callback :
// le résultat du callback est renvoyé tel quel (valeur nue, pas de ré-enveloppe).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

function double(value: number): number {
	return value * 2;
}

const result = add(1, 2);

const doubled = DEither.whenIsRight(result, double);

DCommon.print(doubled);
