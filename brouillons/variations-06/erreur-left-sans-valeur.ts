// Refusé : left sans valeur. Arrêt sur le type undefined (notfound-transformer).
import * as DEither from "@duplojs/lang/either";

export function check(value: number) {
	if (value < 0) {
		return DEither.left("negative");
	}
	return DEither.success(value);
}
