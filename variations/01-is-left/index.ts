// DEither.isLeft sur un succès (faux) puis sur un échec (vrai).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

function failing(): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.fail();
}

const result = add(1, 2);

if (DEither.isLeft(result)) {
	DCommon.print("jamais affiché");
}

const failed = failing();

if (DEither.isLeft(failed)) {
	DCommon.print(failed);
}
