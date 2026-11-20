// else if dont la condition contient un appel : l'appel (et son effet) ne doit avoir lieu
// que si la condition précédente est fausse.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function traced(
	one: number,
	two: number,
): (
	| DEither.Success<number>
	| DEither.Fail
) {
	DCommon.print("évalué");
	return DEither.success(one + two);
}

const first = traced(1, 2);

// Première branche vraie : traced(3, 4) ne doit PAS être évalué.
if (DEither.isRight(first)) {
	DCommon.print("premier");
} else if (DEither.isRight(traced(3, 4))) {
	DCommon.print("second");
} else {
	DCommon.print("aucun");
}

// Première branche fausse : traced(5, 6) est évalué, puis la branche else if s'exécute.
if (DEither.isLeft(first)) {
	DCommon.print("premier");
} else if (DEither.isRight(traced(5, 6))) {
	DCommon.print("second");
} else {
	DCommon.print("aucun");
}
