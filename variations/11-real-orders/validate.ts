import * as DEither from "@duplojs/lang/either";

export type Quantity = number;

export function parseQuantity(raw: number) {
	if (raw < 0) {
		return DEither.left("negative-quantity", raw);
	}
	if (raw % 1 !== 0) {
		return DEither.left("not-integer", "quantité non entière");
	}
	return DEither.success(raw);
}
