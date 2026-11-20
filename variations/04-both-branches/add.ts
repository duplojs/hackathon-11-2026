import * as DEither from "@duplojs/lang/either";

// return dans le if ET dans le else, sans return final : Go accepte un if/else
// dont les deux branches se terminent par return comme instruction terminale.
export function add(
	one: number,
	two: number,
) {
	if (one < 0) {
		return DEither.fail();
	} else {
		return DEither.success(one + two);
	}
}
