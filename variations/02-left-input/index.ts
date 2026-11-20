// whenIsRight sur un Fail : l'entrée est renvoyée inchangée et le callback n'est JAMAIS appelé
// (le print du callback ne doit pas apparaître).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function failing(): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.fail();
}

function traced(value: number): number {
	DCommon.print("callback appelé");
	return value;
}

const out = DEither.whenIsRight(failing(), traced);

DCommon.print(out);
