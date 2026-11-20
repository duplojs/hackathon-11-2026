import * as DCommon from "@duplojs/lang/common";

async function calculate() {
	DCommon.print("inside async function");
	return 42;
}

DCommon.print(await calculate());
