// || et && : la droite n'est calculée que si besoin. isPositive affiche son argument.
import * as DCommon from "@duplojs/lang/common";

function isPositive(value: number) {
	DCommon.print(value);
	return value > 0;
}

// || : la gauche est vraie, isPositive(2) ne doit PAS être appelée.
if (isPositive(1) || isPositive(2)) {
	DCommon.print(10);
}

// && : la gauche est fausse, isPositive(4) ne doit PAS être appelée.
if (isPositive(-3) && isPositive(4)) {
	DCommon.print(20);
}

// || : la gauche est fausse, la droite est calculée.
if (isPositive(-5) || isPositive(6)) {
	DCommon.print(30);
}
