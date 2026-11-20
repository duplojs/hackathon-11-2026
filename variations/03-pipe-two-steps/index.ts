// pipe à deux étapes, dont une fonction utilisateur.
// 1er pipe : valeur nue → fonction utilisateur → coalescing.
// 2e pipe : Either → whenIsRight(double) donne une valeur NUE (6), qui n'est pas un Right :
// le second whenIsRight la renvoie donc inchangée (sémantique de isRight, testée par clés).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { add } from "./add";

function double(value: number): number {
	return value * 2;
}

const plain = DCommon.pipe(
	3,
	double,
	DArray.coalescing,
);

DCommon.print(plain);

const chained = DCommon.pipe(
	add(1, 2),
	DEither.whenIsRight(double),
	DEither.whenIsRight(DArray.coalescing),
);

DCommon.print(chained);
