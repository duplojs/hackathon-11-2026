import * as DEither from "@duplojs/lang/either";
import { type Quantity } from "./validate";

export function price(quantity: Quantity, unit: number) {
	if (unit === 0) {
		return DEither.left("free", "article gratuit");
	}
	return DEither.success(quantity * unit);
}

export function discount(code: string | undefined): number {
	if (code === undefined) {
		return 0;
	}
	if (code === "VIP") {
		return 10;
	}
	return 5;
}
