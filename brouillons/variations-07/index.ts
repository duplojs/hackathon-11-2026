// Exercice 07, partie Either : rightPipe et matchInformation à trois informations.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";
import { divide } from "./divide";

function double(value: number) {
	return value * 2;
}

// Comme dans index.ts : add réussit, puis divide échoue (division par zéro).
const result = DEither.rightPipe(
	add(1, 2),
	(value) => divide(value, 0),
);
DCommon.print(result);

// add échoue : l'étape divide n'est pas exécutée, l'échec de add est gardé.
DCommon.print(
	DEither.rightPipe(
		add(-1, 2),
		(value) => divide(value, 0),
	),
);

// Tout réussit : (4 + 5) / 3.
const divided = DEither.rightPipe(
	add(4, 5),
	(value) => divide(value, 3),
);
DCommon.print(divided);

// matchInformation à trois informations, dont un traitement passé par son nom (double).
const code = DEither.matchInformation(
	result,
	{
		"negative-operand": (operand) => operand,
		"division-by-zero": () => -1,
		success: double,
	},
);
DCommon.print(code);

const doubled = DEither.matchInformation(
	divided,
	{
		"negative-operand": (operand) => operand,
		"division-by-zero": () => -1,
		success: double,
	},
);
DCommon.print(doubled);
