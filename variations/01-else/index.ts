// if / else : la branche then (Either) puis la branche else (condition numérique fausse).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

const result = add(1, 2);

if (DEither.isRight(result)) {
	DCommon.print("succès");
} else {
	DCommon.print("échec");
}

const total = 1 + 2;

if (total > 10) {
	DCommon.print("grand");
} else {
	DCommon.print("petit");
}
