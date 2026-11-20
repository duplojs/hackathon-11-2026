// DString.to (format de String(n), différent de print) sur des nombres limites,
// une chaîne et un booléen.
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

const negativeZero: number = -0;
const big: number = 1e21;
const small: number = 1e-7;
const flag: boolean = true;

DCommon.print(DString.to(negativeZero));
DCommon.print(DString.to(1.5));
DCommon.print(DString.to(big));
DCommon.print(DString.to(small));
DCommon.print(DString.to("déjà une chaîne"));
DCommon.print(DString.to(flag));
