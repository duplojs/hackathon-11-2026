// Exercice 05, variations : le plan B et la conversion en texte.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";
import { add } from "./add";

// 1. Chemin « échec » : le plan B () => [-12] s'exécute -> [ '-12' ].
DCommon.print(DCommon.pipe(
	add(-1, 2),
	DEither.whenIsRightOtherwise(DArray.coalescing, () => [-12]),
	DArray.map(DString.to),
));

// 2. Piège JS : `${-0}` vaut "0" (alors que print affiche -0) -> [ '0' ].
DCommon.print(DCommon.pipe(
	add(-0, -0),
	DEither.whenIsRightOtherwise(DArray.coalescing, () => [-12]),
	DArray.map(DString.to),
));

// 3. Nombre à virgule : formaté comme JS, pas comme fmt de Go -> [ '0.30000000000000004' ].
DCommon.print(DCommon.pipe(
	add(0.1, 0.2),
	DEither.whenIsRightOtherwise(DArray.coalescing, () => [-12]),
	DArray.map(DString.to),
));
