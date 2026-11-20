// Format de DCommon.print (util.inspect de Node) sur des valeurs simples et des nombres limites.
import * as DCommon from "@duplojs/lang/common";

DCommon.print(42);
DCommon.print(3.14);
DCommon.print("hello");
DCommon.print([1, 2, 3]);
DCommon.print(["a", "b"]);
DCommon.print(1e21);
DCommon.print(1e20);
DCommon.print(1e-7);
DCommon.print(0.000001);
DCommon.print(-0);
DCommon.print(NaN);
DCommon.print(Infinity);
DCommon.print(-Infinity);
