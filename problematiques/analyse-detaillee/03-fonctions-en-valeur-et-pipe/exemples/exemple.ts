// Problématique 03 : fonctions passées en valeur, curryfication et pipe.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/03-fonctions-en-valeur-et-pipe/exemples/exemple.ts
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

// - `DArray.coalescing` et `DString.to` sont des fonctions GÉNÉRIQUES passées
//   sans être appelées.
// - `DArray.map(DString.to)` est une forme CURRYFIÉE : elle renvoie la fonction
//   qui attend le tableau.
// - `DCommon.pipe` enchaîne les étapes : chacune reçoit le résultat de la précédente.
const labels = DCommon.pipe(
	3,
	DArray.coalescing,
	DArray.map(DString.to),
);

DCommon.print(labels);

// Un callback écrit sur place capture une variable extérieure (fermeture).
const offset = 10;
const shifted = DCommon.pipe(
	[1, 2, 3],
	DArray.map((value) => value + offset),
);

DCommon.print(shifted);
