// Exercice 03, variations : pipe dans les cas que le sujet ne teste pas.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { add } from "./add";

// 1. Chemin « échec » : l'étape whenIsRight laisse passer l'échec.
DCommon.print(DCommon.pipe(add(-1, 2), DEither.whenIsRight(DArray.coalescing)));

// 2. Bug trouvé en revue : deux fonctions fléchées avec le même paramètre `v`.
//    Avant la correction, Go refusait : `Sourced_v` déclaré deux fois.
DCommon.print(DCommon.pipe(1, (v: number) => v + 1, (v: number) => v * 2));

// 3. Un pipe à trois étapes qui mélange flèche et whenIsRight.
DCommon.print(DCommon.pipe(
	3,
	(value: number) => add(value, 4),
	DEither.whenIsRight(DArray.coalescing),
));
