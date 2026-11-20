import * as DCommon from "@duplojs/lang/common";

function sumPair() {
	const pair: [number, number] = [4, 9];
	const [first, second] = pair;
	return first + second;
}

DCommon.print(sumPair());
