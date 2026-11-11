import * as DEither from "@duplojs/lang/either";
import { createResult } from "./result";

const result = createResult(true);

if (DEither.isLeft(result)) {
	DEither.unwrapLeft(result);
}

if (DEither.isRight(result)) {
	DEither.unwrapRight(result);
}
