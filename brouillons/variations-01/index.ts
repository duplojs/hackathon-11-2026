// Variations de l'exercice 01 qui doivent fonctionner (sortie identique à TS).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

// Fonction sans type de retour écrit : TypeScript le déduit (Success<number>).
function double(value: number) {
	return DEither.success(value * 2);
}

const result = add(1, 2);

// Branche sans accolades + else.
if (DEither.isRight(result)) DCommon.print(result);
else DCommon.print(3);

// else if avec un appel dans sa condition : préparations dans le else.
if (DEither.isRight(add(10, 20))) {
	DCommon.print(add(10, 20));
} else if (DEither.isRight(add(30, 40))) {
	DCommon.print(add(30, 40));
}

// Appel imbriqué dans print, fonction déclarée dans le même fichier.
DCommon.print(double(21));

// if dans une fonction.
function show(value: number) {
	const doubled = double(value);
	if (DEither.isRight(doubled)) {
		DCommon.print(doubled);
	}
	return doubled;
}

show(0.1);
