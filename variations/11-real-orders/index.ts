import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DString from "@duplojs/lang/string";
import { parseQuantity } from "./validate";
import { discount, price } from "./pricing";

type Order = [number, number];

const orders: Order[] = [
	[2, 10],
	[-1, 10],
	[1.5, 3],
	[3, 0],
];

const results = DArray.map(
	orders,
	([quantity, unit]) => DEither.rightPipe(
		parseQuantity(quantity),
		(validQuantity) => price(validQuantity, unit),
	),
);

const messages = DArray.map(
	results,
	(result) => DEither.matchInformation(result, {
		"negative-quantity": (value) => `quantité négative : ${DString.to(value)}`,
		"not-integer": (text) => text,
		free: (text) => text,
		success: (total) => `total : ${DString.to(total)}`,
	}),
);

DCommon.print(messages);
DCommon.print(discount(undefined));
DCommon.print(discount("VIP"));
DCommon.print(discount("AUTRE"));
DCommon.print(DEither.group(results));
