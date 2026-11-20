// Exercice 02, variations : les cas que le sujet ne teste pas.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { add, pair } from "./add";

// 1. Chemin « succès » (celui du sujet) : 3 devient [ 3 ].
DCommon.print(DEither.whenIsRight(add(1, 2), DArray.coalescing));

// 2. Chemin « échec » : whenIsRight renvoie l'échec tel quel.
DCommon.print(DEither.whenIsRight(add(-1, 2), DArray.coalescing));

// 3. Bug trouvé en revue : la valeur est déjà un tableau,
//    coalescing doit la renvoyer telle quelle ([ 1, 1 ], pas [ [ 1, 1 ] ]).
DCommon.print(DEither.whenIsRight(pair(1), DArray.coalescing));
