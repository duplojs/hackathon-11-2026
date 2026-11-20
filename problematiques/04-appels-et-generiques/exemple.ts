import * as DEither from "@duplojs/lang/either";

function trace(label: string, value: number) {
	console.log(label);
	return value;
}

function add(one: number, two: number) {
	return DEither.success(one + two);
}

// JS évalue la fonction, puis les arguments de gauche à droite.
const result = add(trace("premier argument", 1), trace("second argument", 2));

console.log(DEither.isRight(result));
