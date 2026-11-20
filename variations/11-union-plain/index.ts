import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

function pick(value: number) {
	return value > 0 ? "positif" : value;
}

function describe(value: string | number) {
	if (typeof value === "string") {
		return `texte : ${value}`;
	}
	return `nombre : ${DString.to(value)}`;
}

DCommon.print(pick(3));
DCommon.print(pick(-2));
DCommon.print(describe(pick(3)));
DCommon.print(describe(pick(-2)));
DCommon.print(typeof pick(-2));
DCommon.print(pick(3) === "positif");
DCommon.print(pick(-2) === "positif");
DCommon.print(pick(-2) === -2);
