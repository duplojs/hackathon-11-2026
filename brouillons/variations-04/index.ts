// Exercice 04, partie Either : add.ts sans pipe ni whenIsRight.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

// Chemin « échec » : one === -1, add renvoie DEither.fail().
const failed = add(-1, 2);
DCommon.print(failed);

// Chemin « succès », et isRight sur une union Fail | Success.
const succeeded = add(1, 2);
if (DEither.isRight(succeeded)) {
	DCommon.print(succeeded);
}

// Piège du zéro négatif : en JS, -0 + -0 vaut -0, et print affiche -0.
DCommon.print(add(-0, -0));
