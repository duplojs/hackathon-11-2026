import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const successFunctionIdentifier = GoAST.createIdentifier("EitherSuccessOf");

/** Fonction Go de `DEither.success` (success.go). */
export const eitherSuccessDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "either_success.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("success.go")],
				),
			},
		],
	}),
);
