import * as DCommon from "@duplojs/lang/common";
import { isOdd } from "./odd";

const label = "even";

export function isEven(value: number): boolean {
	if (value === 0) {
		return true;
	}
	return isOdd(value - 1);
}

export function evenLabel() {
	return label;
}

DCommon.print("chargement de even");
