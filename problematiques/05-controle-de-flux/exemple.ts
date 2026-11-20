function check(value: number) {
	console.log("check appelé");
	return value * 2;
}

// Ternaire : une seule branche est évaluée.
function pick(one: number, two: number) {
	return one < 0 ? one : two;
}

const ready = 3;

// Court-circuit : check n'est pas appelé, car ready > 1 est vrai.
const ok = ready > 1 || check(2) > 0;

console.log(ok);
console.log(pick(-1, 2));
console.log(pick(1, 2));
