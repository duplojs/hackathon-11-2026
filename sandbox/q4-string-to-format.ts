import * as DString from "@duplojs/lang/string";

const cases: [string, unknown][] = [
	["entier positif", 42],
	["entier négatif", -42],
	["zéro", 0],
	["moins zéro", -0],
	["décimal", 3.14],
	["décimal négatif", -3.14],
	["très grand nombre", 1e21],
	["très grand nombre (1e20, limite)", 1e20],
	["très petit nombre", 1e-7],
	["très petit nombre (1e-6, limite)", 1e-6],
	["NaN", NaN],
	["Infinity", Infinity],
	["-Infinity", -Infinity],
	["string", "déjà une chaîne"],
	["boolean true", true],
	["boolean false", false],
	["null", null],
	["undefined", undefined],
];

for (const [label, value] of cases) {
	const result = DString.to(value as never);
	console.log(`${label.padEnd(35)} input=${String(value).padEnd(10)} -> DString.to = ${JSON.stringify(result)} | native \`\${value}\` = ${JSON.stringify(`${value}`)}`);
}
