import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

console.log("=== tableau, tous succès ===");
DCommon.print(DEither.group([
	DEither.success("Alice"),
	DEither.success(2),
]));

console.log("=== tableau, un échec au milieu : arrêt au premier Left ? ===");
let secondCalled = false;
let thirdCalled = false;
DCommon.print(DEither.group([
	DEither.success("Alice"),
	(() => {
		secondCalled = true;
		return DEither.left("first-error", "boom");
	})(),
	(() => {
		thirdCalled = true;
		return DEither.left("second-error", "never");
	})(),
]));
console.log("secondCalled:", secondCalled, "thirdCalled:", thirdCalled);

console.log("=== tableau de getters : la fabrique après l'échec est-elle appelée ? ===");
let afterErrorGetterCalled = false;
DCommon.print(DEither.group([
	() => DEither.success("Alice"),
	() => DEither.left("user-not-found", "id-1"),
	() => {
		afterErrorGetterCalled = true;
		return DEither.success("never-used");
	},
]));
console.log("afterErrorGetterCalled:", afterErrorGetterCalled);

console.log("=== objet, un échec : quel left est renvoyé et quels getters après ne sont pas appelés ? ===");
let skippedGetterCalled = false;
DCommon.print(DEither.group({
	user: () => DEither.success("Alice"),
	error1: () => DEither.left("error-1", "e1"),
	error2: () => DEither.left("error-2", "e2"),
	skipped: () => {
		skippedGetterCalled = true;
		return DEither.success("x");
	},
}));
console.log("skippedGetterCalled:", skippedGetterCalled);

console.log("=== tableau vide ===");
DCommon.print(DEither.group([]));

console.log("=== objet vide ===");
DCommon.print(DEither.group({}));
