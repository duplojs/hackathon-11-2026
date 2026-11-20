// Référence TypeScript : les règles de console.log (util.inspect de Node)
// que la fonction Go Print doit reproduire caractère par caractère.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

// 1. Nombres : écriture de JS, pas celle de Go.
DCommon.print(1e21);   // 1e+21 : même écriture en Go
DCommon.print(1e-7);   // 1e-7 : Go écrirait 1e-07
DCommon.print(-0);
DCommon.print(2 ** 53);

// 2. Chaînes : sans guillemets au premier niveau, avec des guillemets choisis comme Node dans un tableau.
DCommon.print("texte brut");
DCommon.print(["simple", "it's", "it's \"x\""]);

// 3. Longueurs en unités UTF-16 (un emoji compte pour 2) : décide du passage à la ligne.
DCommon.print(["😀😀😀😀😀😀😀😀😀😀", "😀😀😀😀😀😀😀😀😀😀", "😀😀😀😀😀😀😀😀😀😀", "😀😀😀😀😀😀"]);

// 4. Plus de 6 éléments : rangés en colonnes, nombres alignés à droite.
DCommon.print(Array.from({ length: 26 }, (_, index) => index * 7));

// 5. Un objet qui ne tient pas sur 80 caractères : une clé par ligne.
DCommon.print(DEither.success(3));

// 6. Profondeur maximale 2 : au-delà, Node écrit [Array] ou [Object].
DCommon.print([[[DEither.success(1)]]]);
