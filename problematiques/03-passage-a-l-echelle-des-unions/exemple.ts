import * as DEither from "@duplojs/lang/either";
import * as DString from "@duplojs/lang/string";

// 5 variantes, 4 types de valeur : number, string, undefined, boolean.
function checkUserName(size: number, code: number) {
	if (size < 3) {
		return DEither.left("too-short", size);
	}
	if (code === 1) {
		return DEither.left("forbidden-char", "@");
	}
	if (code === 2) {
		return DEither.fail();
	}
	if (code === 3) {
		return DEither.left("reserved", code > 2);
	}

	return DEither.success("valid-username");
}

function describe(size: number, code: number) {
	return DEither.matchInformation(checkUserName(size, code), {
		"too-short": (value) => DString.to(value),
		"forbidden-char": (value) => value,
		fail: () => "fail",
		reserved: () => "reserved",
		success: (value) => value,
	});
}

console.log(describe(1, 0));
console.log(describe(5, 1));
console.log(describe(5, 2));
console.log(describe(5, 3));
console.log(describe(5, 0));
