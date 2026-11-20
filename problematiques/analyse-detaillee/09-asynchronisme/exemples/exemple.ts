// Problématique 09 : traduire async / await et Promise.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/09-asynchronisme/exemples/exemple.ts
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function divide(value: number, divisor: number) {
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}

	return DEither.success(value / divisor);
}

async function calculate(value: number, divisor: number) {
	console.log(`calcule ${value} / ${divisor}`);
	return DEither.rightAsyncPipe(
		divide(value, divisor),
		(quotient) => DEither.success(quotient * 2),
	);
}

// 1. Cas du projet 10 : chaque promesse est attendue avant la suivante.
//    asyncGroup appelle les getters UN PAR UN et s'arrête au premier échec.
const transaction = await DEither.asyncGroup([
	() => calculate(6, 3),
	() => calculate(1, 0),
	() => calculate(8, 2),
]);
DCommon.print(DEither.isRight(transaction) ? "validée" : "annulée");

// 2. Limite de l'aplatissement : deux tâches lancées SANS être attendues
//    tout de suite s'entrelacent à chaque `await`.
async function task(name: string): Promise<void> {
	for (const step of [1, 2]) {
		console.log(name, step);
		await null;
	}
}

const first = task("A");
const second = task("B");
await first;
await second;
// Sortie JS : A 1, B 1, A 2, B 2 (entrelacée)
