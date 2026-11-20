// Référence TypeScript : des expressions qui décident elles-mêmes de ce qui est calculé.
// Chaque fonction affiche son argument : la sortie montre ce qui a été calculé, et dans quel ordre.
import * as DCommon from "@duplojs/lang/common";

function isPositive(value: number) {
	DCommon.print(value);
	return value > 0;
}

function pick(value: number) {
	DCommon.print(value);
	return value;
}

// 1. || : la gauche est vraie, isPositive(2) n'est PAS appelée.
if (isPositive(1) || isPositive(2)) {
	DCommon.print("ou : vrai");
}

// 2. && : la gauche est fausse, isPositive(4) n'est PAS appelée.
// 3. else if : sa condition n'est calculée que si la première est fausse.
if (isPositive(-3) && isPositive(4)) {
	DCommon.print("et : vrai");
} else if (isPositive(5)) {
	DCommon.print("else if : vrai");
}

// 4. Ternaire : seule la branche choisie est calculée, pick(20) n'est PAS appelée.
const chosen = isPositive(7) ? pick(10) : pick(20);
DCommon.print(chosen);

// 5. Plusieurs chemins de retour, dont un ternaire dans un return.
function sign(value: number) {
	if (value < 0) {
		return "négatif";
	}
	return value === 0 ? "nul" : "positif";
}

DCommon.print(sign(-2));
DCommon.print(sign(0));
DCommon.print(sign(9));
