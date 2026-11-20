// Callback qui renvoie lui-même un Either : il n'est pas ré-enveloppé (pas de Success(Success(…))).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

function half(value: number): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.success(value / 2);
}

const out = DEither.whenIsRight(add(1, 2), half);

DCommon.print(out);
