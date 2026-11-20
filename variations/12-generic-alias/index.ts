import * as DCommon from "@duplojs/lang/common";

type Box<T> = { value: T };

type Pair<A, B = string> = { first: A; second: B };

interface Meta {
	total: number;
}

interface Page<T> extends Meta {
	items: T[];
}

function box(value: number): Box<number> {
	return { value };
}

function page(items: string[]): Page<string> {
	return {
		total: items.length,
		items,
	};
}

const pair: Pair<number> = { first: 1, second: "un" };
const boxes: Box<Box<string>> = { value: { value: "imbriqué" } };

DCommon.print(box(3));
DCommon.print(box(3).value + 1);
DCommon.print(page(["a", "b"]));
DCommon.print(pair);
DCommon.print(boxes.value.value);
