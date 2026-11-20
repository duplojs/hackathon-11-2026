import * as DCommon from "@duplojs/lang/common";
import { isEven } from "./even";

const label = "odd";

export function isOdd(value: number): boolean {
	if (value === 0) {
		return false;
	}
	return isEven(value - 1);
}

export function oddLabel() {
	return label;
}

DCommon.print("chargement de odd");
