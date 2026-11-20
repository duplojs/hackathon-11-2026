// Refusé : Fail et Left<"negative", number> donnent deux types Go pour un seul L.
import * as DEither from "@duplojs/lang/either";
export function check(value: number): DEither.Fail | DEither.Left<"negative", number> | DEither.Success<number> {
	return DEither.success(value);
}
