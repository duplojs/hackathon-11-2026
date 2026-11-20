// Reconnaissance par symbole : imports nommés renommés et namespace sous un autre nom.
import { isRight as ok } from "@duplojs/lang/either";
import { print as show } from "@duplojs/lang/common";
import * as E from "@duplojs/lang/either";
import * as C from "@duplojs/lang/common";
import { add } from "./add";

const result = add(1, 2);

if (ok(result)) {
	show(result);
}

if (E.isRight(result)) {
	C.print(result);
}
