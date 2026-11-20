import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

console.log("=== DCommon.pipe : aucune étape ===");
console.log(DCommon.pipe(42));

console.log("=== DCommon.pipe : plusieurs étapes synchrones ===");
console.log(DCommon.pipe(
	2,
	(v) => v + 1,
	(v) => v * 10,
));

console.log("\n=== DCommon.asyncPipe : mélange d'étapes sync et async, entrée Promise ===");
console.log(await DCommon.asyncPipe(
	Promise.resolve(2),
	(v) => v + 1,
	async (v) => {
		await new Promise((r) => setTimeout(r, 10));
		return v * 10;
	},
));

console.log("\n=== DArray.coalescing : valeur simple ===");
console.log(DArray.coalescing(42));

console.log("=== DArray.coalescing : déjà un tableau (même référence conservée ?) ===");
const original = [1, 2, 3];
const coalesced = DArray.coalescing(original);
console.log(coalesced, "=== même référence:", coalesced === original);

console.log("=== DArray.coalescing : tableau vide ===");
console.log(DArray.coalescing([]));

console.log("=== DArray.coalescing : valeur null/undefined ===");
console.log(DArray.coalescing(null));
console.log(DArray.coalescing(undefined));

console.log("\n=== DArray.map : tableau vide ===");
console.log(DArray.map([], (v) => v));

console.log("=== DArray.map : forme directe avec index/self ===");
console.log(DArray.map(["a", "b", "c"], (v, ctx) => `${ctx.index}:${v}:len=${ctx.self.length}`));

console.log("=== DArray.map : forme curryfiée dans un pipe ===");
console.log(DCommon.pipe(
	[1, 2, 3],
	DArray.map((v) => v * 2),
));

console.log("\n=== DString.to : tableau et objet (stringifiable via template literal) ===");
console.log(DString.to([1, 2, 3] as never));
console.log(DString.to({ a: 1 } as never));
