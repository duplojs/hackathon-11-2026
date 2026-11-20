// pipe à une seule étape (fonction utilisateur sur une valeur nue).
// NB : pipe(x) SANS étape est refusé par TypeScript (« Expected 2-16 arguments, but got 1 ») bien que
// le runtime l'accepte (docs/duplojs-semantics.md) : ce cas est hors du TypeScript valide, donc hors périmètre.
import * as DCommon from "@duplojs/lang/common";

function double(value: number): number {
	return value * 2;
}

const doubled = DCommon.pipe(3, double);

DCommon.print(doubled);
