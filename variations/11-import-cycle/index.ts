import * as DCommon from "@duplojs/lang/common";
import { isEven, evenLabel } from "./even";
import { oddLabel } from "./odd";

DCommon.print(isEven(10));
DCommon.print(isEven(7));
DCommon.print(evenLabel());
DCommon.print(oddLabel());
