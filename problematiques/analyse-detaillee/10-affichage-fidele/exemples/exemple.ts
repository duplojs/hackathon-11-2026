// Problématique 10 : reproduire exactement l'affichage de Node.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/10-affichage-fidele/exemples/exemple.ts
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

// Number::toString : notation décimale jusqu'à 1e21, exponentielle au-delà,
// et pour les très petits nombres (< 1e-6).
const samples = [3, 0.1 + 0.2, 123456789012, 1e21, 1.5e-7, 0.000001, -0, 2 ** 53];
console.log(samples.map((value) => DString.to(value)).join(" | "));

// Nuance : DString.to(-0) donne "0", mais print(-0) affiche -0.
DCommon.print(-0);

// Une chaîne affichée seule n'a pas de guillemets, elle en a dans un tableau.
DCommon.print("échec");
DCommon.print(["3", "3", "échec"]);
DCommon.print([3, 0.1 + 0.2]);
DCommon.print([]);
