import * as DCommon from "@duplojs/lang/common";

function half(value: number): number | undefined {
	if (value % 2 !== 0) {
		return undefined;
	}
	return value / 2;
}

function orZero(value: number) {
	return half(value) ?? 0;
}

function isMissing(value: number) {
	return half(value) === undefined;
}

DCommon.print(half(8));
DCommon.print(half(7));
DCommon.print(orZero(8));
DCommon.print(orZero(7));
DCommon.print(isMissing(7));
DCommon.print(isMissing(8));
