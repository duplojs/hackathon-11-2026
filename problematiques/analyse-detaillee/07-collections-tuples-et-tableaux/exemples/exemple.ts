// Problématique 07 : tableaux, tuples et transformations de collections.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/07-collections-tuples-et-tableaux/exemples/exemple.ts
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

// Tableau de tuples : la POSITION donne le rôle (opérande, opérande, diviseur).
const inputs: [number, number, number][] = [
	[1, 2, 1],
	[4, 5, 3],
	[2, 3, 4],
];

// map conserve l'ordre et la longueur.
const quotients = DArray.map(inputs, ([one, two, divisor]) => (one + two) / divisor);
DCommon.print(quotients);

// map sur un tuple : le résultat garde une longueur connue (LengthEqual<1>).
const single: readonly [number] = [42];
DCommon.print(DArray.map(single, DString.to));

// coalescing : garde un tableau tel quel, enveloppe une autre valeur.
DCommon.print(DArray.coalescing(7));
DCommon.print(DArray.coalescing([7, 8]));
