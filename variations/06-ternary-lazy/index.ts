// Ternaire : seule la branche choisie est évaluée (effet observable dans les deux branches).
import * as DCommon from "@duplojs/lang/common";

function traced(label: string): string {
	DCommon.print(`évalué : ${label}`);
	return label;
}

function pick(flag: boolean): string {
	return flag ? traced("oui") : traced("non");
}

DCommon.print(pick(true));
DCommon.print(pick(false));

const count = 3;
DCommon.print(count > 2 ? count * 10 : -count);
