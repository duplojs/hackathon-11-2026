// Refusé : condition non booléenne (« truthiness » JS).
import * as DCommon from "@duplojs/lang/common";

const count = 3;
DCommon.print(count ? 1 : 2);
