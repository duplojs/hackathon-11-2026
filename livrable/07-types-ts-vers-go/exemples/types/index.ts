// Référence TypeScript : les types que le checker TS calcule dans les exercices 02 à 07,
// et qui n'ont pas d'équivalent direct en Go. Le type est indiqué au-dessus de chaque valeur.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

function add(one: number, two: number): DEither.Success<number> | DEither.Fail {
	return DEither.success(one + two);
}

// Type déduit : Left<"division-by-zero", 0> | Success<number>   (0 est un type « littéral »)
function divide(value: number, divisor: number) {
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}
	return DEither.success(value / divisor);
}

const result = add(1, 2);

// 1. DEither.Fail | readonly [number] : un Either OU un tableau.
const coalesced = DEither.whenIsRight(result, DArray.coalescing);
DCommon.print(coalesced);

// 2. [-12] | readonly [number] : deux tuples différents pour TS, le même tableau de nombres pour Go.
const numbers = DEither.whenIsRightOtherwise(result, DArray.coalescing, () => [-12]);
DCommon.print(numbers);

// 3. readonly (string & Number)[] & LengthEqual<1> : des chaînes « marquées » par DuploJS,
//    dans un tableau « marqué » de longueur 1 (les marques n'existent qu'à la compilation).
const labels = DArray.map(numbers, DString.to);
DCommon.print(labels);

// 4. Left<"division-by-zero", 0> : la valeur 0 a le type littéral `0`.
DCommon.print(divide(1, 0));
