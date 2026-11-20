import * as DCommon from "@duplojs/lang/common";

async function addFive(value: number) {
	return value + 5;
}

const result = DCommon.asyncPipe(
	3,
	addFive,
	(value) => value * 2,
);

DCommon.print(await result);
