// whenIsRightOtherwise (forme directe) sur un Fail : seule la branche « otherwise » est évaluée,
// et elle reçoit l'Either COMPLET (pas sa valeur). Le callback Right ne doit pas être appelé.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function failing(): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.fail();
}

function traced(value: number): number[] {
	DCommon.print("callback right appelé");
	return [value];
}

const out = DEither.whenIsRightOtherwise(
	failing(),
	traced,
	(either) => [DEither.isLeft(either) ? -1 : 0],
);

DCommon.print(out);
