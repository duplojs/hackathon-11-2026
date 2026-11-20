// Problématique 04 : expressions TypeScript sans équivalent direct en Go.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/04-expressions-sans-equivalent-go/exemples/exemple.ts

function isNegative(label: string, value: number): boolean {
	console.log("teste", label);
	return value < 0;
}

// 1. Ternaire : Go n'a pas d'opérateur `? :`.
function pickOperand(one: number, two: number): number {
	return one < 0 ? one : two;
}

console.log("ternaire =", pickOperand(-1, 2));

// 2. Court-circuit : le côté droit n'est évalué que si nécessaire.
//    Ici `isNegative("two", …)` n'est jamais appelé.
const hasNegative = isNegative("one", -1) || isNegative("two", 2);
console.log("||  =", hasNegative);

// 3. Déstructuration positionnelle dans un paramètre.
const inputs: Array<[number, number, number]> = [
	[1, 2, 1],
	[4, 5, 3],
];

const sums = inputs.map(([one, , divisor]) => (one + divisor));
console.log("déstructuration =", sums);
