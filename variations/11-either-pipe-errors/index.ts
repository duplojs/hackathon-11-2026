import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

function parse(value: number) {
	if (value < 0) {
		return DEither.left("negative", value);
	}
	return DEither.success(value);
}

function label(value: number) {
	if (value === 0) {
		return DEither.left("empty", "aucune valeur");
	}
	return DEither.success(value * 2);
}

DCommon.print(DEither.rightPipe(parse(4), (value) => label(value)));
DCommon.print(DEither.rightPipe(parse(-4), (value) => label(value)));
DCommon.print(DEither.rightPipe(parse(0), (value) => label(value)));
