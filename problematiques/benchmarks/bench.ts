import * as DEither from "@duplojs/lang/either";

function addConcrete(one: number, two: number) {
	return DEither.success(one + two);
}

function addUnion(one: number, two: number) {
	if (one < 0 || two < 0) {
		return DEither.left("negative-operand", one);
	}

	return DEither.success(one + two);
}

const calls = 5_000_000;
let sink: unknown;

function bench(name: string, run: (index: number) => unknown) {
	for (let index = 0; index < 200_000; index++) {
		sink = run(index);
	}

	for (let attempt = 0; attempt < 3; attempt++) {
		const start = performance.now();
		for (let index = 0; index < calls; index++) {
			sink = run(index);
		}
		const nanoseconds = ((performance.now() - start) * 1e6) / calls;
		console.log(`${name} ${nanoseconds.toFixed(2)} ns/op`);
	}
}

bench("AddConcrete    ", (index) => DEither.unwrapRight(addConcrete(index & 1023, 2)));
bench("AddUnionSuccess", (index) => DEither.isRight(addUnion(index & 1023, 2)));
bench("AddUnionLeft   ", (index) => DEither.isRight(addUnion(-1, index & 1023)));

void sink;
