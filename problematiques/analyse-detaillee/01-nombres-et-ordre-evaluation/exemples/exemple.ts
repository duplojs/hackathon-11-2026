// Problématique 01 : nombres et ordre d'évaluation.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/01-nombres-et-ordre-evaluation/exemples/exemple.ts

// 1. Toute l'arithmétique JavaScript se fait en double précision IEEE 754.
const tenth = 0.1;
const fifth = 0.2;
console.log("0.1 + 0.2 =", tenth + fifth);
console.log("-0 =", Object.is(-tenth * 0, -0) ? "-0" : "0");

// 2. Les opérandes sont évalués de gauche à droite, effets compris.
let counter = 1;

function bump(): number {
	counter += 10;
	return counter;
}

const total = counter + bump();
console.log("counter + bump() =", total);

// 3. Un appel évalue d'abord la fonction, puis ses arguments, dans l'ordre.
function trace(label: string, value: number): number {
	console.log("évalue", label);
	return value;
}

function add(one: number, two: number): number {
	return one + two;
}

console.log("add =", add(trace("premier", 1), trace("second", 2)));
