import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const leftFunctionIdentifier = GoAST.createIdentifier("EitherLeftOf");

/** Fonction Go de `DEither.left` (left.go). */
export const eitherLeftDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "either_left.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("left.go")],
				),
			},
		],
	}),
);
