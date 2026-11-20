import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

console.log("=== success / fail / left : structure ===");
console.log("success(3) keys:", Object.keys(DEither.success(3)));
console.log("fail() keys:", Object.keys(DEither.fail()));
console.log("left('info','v') keys:", Object.keys(DEither.left("info", "v")));
console.log("left('info') (sans valeur) :", DEither.left("info"));

console.log("\n=== isRight / isLeft ===");
console.log("isRight(success):", DEither.isRight(DEither.success(1)));
console.log("isRight(fail):", DEither.isRight(DEither.fail()));
console.log("isLeft(success):", DEither.isLeft(DEither.success(1)));
console.log("isLeft(fail):", DEither.isLeft(DEither.fail()));
console.log("isLeft(left):", DEither.isLeft(DEither.left("x", 1)));

console.log("\n=== whenIsRight : forme directe ===");
console.log(DEither.whenIsRight(DEither.success(5), (v) => v * 2));
console.log("whenIsRight sur un Left (transmis inchangé) :", DEither.whenIsRight(DEither.fail(), (v) => "never"));

console.log("\n=== whenIsRight : forme curryfiée dans un pipe ===");
console.log(DCommon.pipe(
	DEither.success(5),
	DEither.whenIsRight((v) => v * 2),
));

console.log("\n=== whenIsRight : la callback renvoie elle-même un Either (pas déballé) ===");
console.log(DEither.whenIsRight(DEither.success(5), (v) => DEither.success(v * 2)));

console.log("\n=== whenIsRightOtherwise : forme directe, branche Right et branche autre ===");
console.log(DEither.whenIsRightOtherwise(DEither.success(5), (v) => `right:${v}`, (other) => `other:${JSON.stringify(other)}`));
console.log(DEither.whenIsRightOtherwise(DEither.left("bad", "x"), (v) => `right:${v}`, (other) => `other-info:${DEither.isLeft(other) ? "left" : "?"}`));

console.log("\n=== whenIsRightOtherwise : forme curryfiée ===");
console.log(DCommon.pipe(
	DEither.fail(),
	DEither.whenIsRightOtherwise(
		(v) => `right:${v}`,
		() => "fallback",
	),
));

console.log("\n=== matchInformation : exhaustif, forme directe ===");
console.log(DEither.matchInformation(DEither.success(5), {
	success: (v) => `ok:${v}`,
}));
console.log(DEither.matchInformation(DEither.left("negative-operand", -1), {
	success: (v) => `ok:${v}`,
	"negative-operand": (v) => `neg:${v}`,
}));

console.log("\n=== matchInformation : forme curryfiée ===");
console.log(DCommon.pipe(
	DEither.left("negative-operand", -1),
	DEither.matchInformation({
		success: (v: unknown) => `ok:${v}`,
		"negative-operand": (v: number) => `neg:${v}`,
	}),
));

console.log("\n=== matchInformation : information sans handler correspondant (contournement runtime du typage exhaustif) ===");
try {
	// @ts-expect-error -- on force volontairement un matcher incomplet pour observer le runtime
	const result = DEither.matchInformation(DEither.left("unhandled-info", 1), {
		success: (v: unknown) => `ok:${v}`,
	});
	console.log("résultat:", result);
} catch (error) {
	console.log("exception levée:", error instanceof Error ? error.message : error);
}
