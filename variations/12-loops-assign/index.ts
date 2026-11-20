import * as DCommon from "@duplojs/lang/common";

function sum(values: number[]) {
	let total = 0;
	for (const value of values) {
		total += value;
	}
	return total;
}

function countdown(start: number) {
	let current = start;
	const steps: number[] = [];
	while (current > 0) {
		if (current === 2) {
			current--;
			continue;
		}
		current -= 1;
	}
	for (let index = 0; index < 3; index++) {
		if (index === 2) {
			break;
		}
		DCommon.print(`tour ${index}`);
	}
	return current + steps.length;
}

function firstNegative(values: number[]) {
	let found: number | undefined;
	for (const value of values) {
		if (value < 0) {
			found = value;
			break;
		}
	}
	return found;
}

function label(code: number) {
	let text: string | number = code;
	if (code > 10) {
		text = "grand";
	}
	return text;
}

let attempts = 0;
do {
	attempts++;
} while (attempts < 3);

const pairs: [string, number][] = [["a", 1], ["b", 2]];
for (const [name, value] of pairs) {
	DCommon.print(`${name}=${value}`);
}

DCommon.print(sum([1, 2, 3.5]));
DCommon.print(countdown(5));
DCommon.print(firstNegative([3, -2, -5]));
DCommon.print(firstNegative([3]));
DCommon.print(label(3));
DCommon.print(label(30));
DCommon.print(attempts);
DCommon.print((attempts + 1) * 2);
DCommon.print(!(attempts > 1));
DCommon.print(7 % 3);
