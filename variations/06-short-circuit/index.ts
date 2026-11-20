// && et || court-circuitent (D2) : l'opérande de droite, qui a un effet observable,
// n'est évalué que si nécessaire.
import * as DCommon from "@duplojs/lang/common";

function traced(label: string, result: boolean): boolean {
	DCommon.print(`évalué : ${label}`);
	return result;
}

const first = traced("a", true) || traced("b", true);
const second = traced("c", false) && traced("d", true);
const third = traced("e", false) || traced("f", true);

DCommon.print(first);
DCommon.print(second);
DCommon.print(third);
