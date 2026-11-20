// Référence TypeScript : trois comportements de `number` que le Go doit reproduire.
import * as DCommon from "@duplojs/lang/common";

// 1. Arithmétique IEEE 754 double précision (limite notée à l'exercice 01).
DCommon.print(0.1 + 0.2);

// 2. Zéro négatif (exercice 04).
DCommon.print(-0);

// 3. Division par zéro : pas d'erreur, des valeurs spéciales (exercice 07).
const zero = 0;
DCommon.print(1 / zero);
DCommon.print(-1 / zero);
DCommon.print(zero / zero);
