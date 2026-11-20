// Refusé pour l'instant : traitement avec un bloc { ... return ... }.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

const message = DEither.matchInformation(
	add(1, 2),
	{
		"negative-operand": () => {
			return 0;
		},
		success: (value) => value,
	},
);
DCommon.print(message);
