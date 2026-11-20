// Exercice 06, partie Either : left, ternaire, || et matchInformation.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

// Échec : un Left « negative-operand » (pas de clé en plus, contrairement à fail()).
const failed = add(-1, 2);
DCommon.print(failed);

// Le ternaire choisit le second opérande quand le premier est positif.
DCommon.print(add(1, -5));

// matchInformation : un traitement par information, comme dans index.ts.
const message = DEither.matchInformation(
	failed,
	{
		"negative-operand": () => "un opérande est négatif",
		success: () => "calcul réussi",
	},
);
DCommon.print(message);

// Chaque traitement reçoit la valeur du bon côté (Left ou Right).
const succeeded = add(1, 2);
const doubled = DEither.matchInformation(
	succeeded,
	{
		"negative-operand": (operand) => operand * 10,
		success: (value) => value * 2,
	},
);
DCommon.print(doubled);
