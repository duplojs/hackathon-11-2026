// Forme curryfiée stockée dans une constante puis réutilisée deux fois (limite attendue, ADR-3) :
// la fonction doit exister comme valeur Go (func literal), pas seulement inlinée dans un pipe.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { add } from "./add";

const step = DEither.whenIsRight(DArray.coalescing);

DCommon.print(step(add(1, 2)));
DCommon.print(step(add(3, 4)));
