import * as DCommon from "@duplojs/lang/common";

type Shape =
	| { kind: "circle"; radius: number }
	| { kind: "rectangle"; width: number; height: number };

function area(shape: Shape) {
	if (shape.kind === "circle") {
		return 3 * shape.radius * shape.radius;
	}
	return shape.width * shape.height;
}

function label(value: { name: string } | { age: number }) {
	if ("name" in value) {
		return value.name;
	}
	return "inconnu";
}

const shapes: Shape[] = [
	{ kind: "circle", radius: 2 },
	{ kind: "rectangle", width: 3, height: 4 },
];

DCommon.print(area({ kind: "circle", radius: 1 }));
DCommon.print(area({ kind: "rectangle", width: 2, height: 5 }));
DCommon.print(shapes);
DCommon.print(shapes[0]!.kind);
DCommon.print(label({ name: "Alice" }));
DCommon.print(label({ age: 3 }));
