import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";

const inputs: [number, number][] = [];
const sums = DArray.map(inputs, ([one, two]) => one + two);

DCommon.print(sums);
