import * as DEither from "@duplojs/lang/either";

// const à l'intérieur d'une fonction : déclaration locale Go (:=), pas de variable de package.
export function add(
	one: number,
	two: number,
): (
	| DEither.Success<number>
	| DEither.Fail
) {
	const sum = one + two;
	const doubled = sum + sum;
	return DEither.success(doubled);
}
