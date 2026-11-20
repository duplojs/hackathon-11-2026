// Compare la sortie Go de jsNumberToString avec String(x) du moteur JavaScript.
// Usage : pnpm exec tsx problematiques/analyse-detaillee/10-affichage-fidele/exemples/compare.ts <fichier>
import { readFileSync } from "node:fs";

const path = process.argv[2];

if (!path) {
	throw new Error("fichier d'échantillons manquant");
}

const view = new DataView(new ArrayBuffer(8));
const lines = readFileSync(path, "utf8").trim().split("\n");
const mismatches: string[] = [];

for (const line of lines) {
	const [bits = "", goText = ""] = line.split(" ");
	view.setBigUint64(0, BigInt(`0x${bits}`));
	const jsText = String(view.getFloat64(0));

	if (jsText !== goText) {
		mismatches.push(`${bits}: js=${jsText} go=${goText}`);
	}
}

console.log(`${lines.length} valeurs comparées, ${mismatches.length} différence(s)`);
console.log(mismatches.slice(0, 10).join("\n"));
