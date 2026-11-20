import * as DEither from "@duplojs/lang/either";

async function calculate(label: string, value: number) {
	console.log(`calcul ${label}`);

	if (value === 0) {
		return DEither.left("zero", value);
	}

	return DEither.success(value);
}

// asyncGroup appelle les fonctions une par une et s'arrête au premier échec :
// "calcul 3" n'est jamais affiché.
const result = await DEither.asyncGroup([
	() => calculate("1", 1),
	() => calculate("2", 0),
	() => calculate("3", 3),
]);

console.log(DEither.isRight(result));
