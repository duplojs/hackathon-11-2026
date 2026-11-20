import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

console.log("=== étape unique qui renvoie une valeur brute (non-Either) ===");
const r1 = DEither.rightPipe(
	DEither.success(1),
	(value) => value + 1,
);
DCommon.print(r1);

console.log("=== étape intermédiaire brute puis étape finale brute ===");
const r2 = DEither.rightPipe(
	DEither.success(1),
	(value) => value + 1,
	(value) => value * 10,
);
DCommon.print(r2);

console.log("=== entrée brute (pas un Either) ===");
const r3 = DEither.rightPipe(
	1,
	(value) => value + 1,
);
DCommon.print(r3);

console.log("=== étape brute qui renvoie elle-même un objet qui RESSEMBLE a un Either (mais n'en est pas un) ===");
const r4 = DEither.rightPipe(
	DEither.success(1),
	(value) => ({ fake: "not-an-either", value }),
);
DCommon.print(r4);

console.log("=== mélange : brute puis Right explicite puis brute ===");
const r5 = DEither.rightPipe(
	DEither.success(1),
	(value) => value + 1,
	(value) => DEither.right("doubled", value * 2),
	(value) => value + 100,
);
DCommon.print(r5);
