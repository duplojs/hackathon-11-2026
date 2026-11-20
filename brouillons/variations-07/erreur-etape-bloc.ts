// Refusé pour l'instant : étape écrite avec un bloc { ... return ... }.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";
import { divide } from "./divide";

DCommon.print(
	DEither.rightPipe(
		add(1, 2),
		(value) => {
			return divide(value, 3);
		},
	),
);
