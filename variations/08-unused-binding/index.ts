import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";

const pairs: [number, number][] = [[11, 22]];
const firstValues = DArray.map(pairs, ([first, unused]) => first);
const [unread] = [DCommon.print("source still evaluated")];

DCommon.print(firstValues);
