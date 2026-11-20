import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const failFunctionIdentifier = GoAST.createIdentifier("EitherFailOf");

/** Fonction Go de `DEither.fail` (fail.go). */
export const eitherFailDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "either_fail.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("fail.go")],
				),
			},
		],
	}),
);
