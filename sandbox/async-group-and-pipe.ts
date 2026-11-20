import * as DEither from "@duplojs/lang/either";

console.log("=== rightAsyncPipe : arrêt au premier Left, étape suivante jamais appelée ===");
let neverCalled = false;
const r1 = await DEither.rightAsyncPipe(
	Promise.resolve(DEither.success(1)),
	async () => DEither.error("stop-here"),
	async () => {
		neverCalled = true;
		return "never";
	},
);
console.log(r1, "neverCalled:", neverCalled);

console.log("\n=== rightAsyncPipe : Left initial propagé sans exécuter d'étape ===");
let stepCalled = false;
const r2 = await DEither.rightAsyncPipe(
	Promise.resolve(DEither.left("initial-fail", 1)),
	async (v) => {
		stepCalled = true;
		return v;
	},
);
console.log(r2, "stepCalled:", stepCalled);

console.log("\n=== asyncGroup (tableau) : arrêt au premier Left, fabrique suivante jamais appelée ===");
let afterErrorCalled = false;
const r3 = await DEither.asyncGroup([
	() => Promise.resolve(DEither.success("a")),
	() => Promise.resolve(DEither.left("boom", "x")),
	async () => {
		afterErrorCalled = true;
		return DEither.success("never");
	},
]);
console.log(r3, "afterErrorCalled:", afterErrorCalled);

console.log("\n=== asyncGroup (objet) : les clés avant l'erreur sont-elles dans le Left final ? ===");
const r4 = await DEither.asyncGroup({
	a: () => Promise.resolve(DEither.success(1)),
	b: () => Promise.resolve(DEither.left("err-b", "value-b")),
	c: () => Promise.resolve(DEither.success(3)),
});
console.log(r4);
