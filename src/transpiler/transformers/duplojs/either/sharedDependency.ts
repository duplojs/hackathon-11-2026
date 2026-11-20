import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const eitherTypeIdentifier = GoAST.createIdentifier("Either");
export const eitherIsRightFieldIdentifier = GoAST.createIdentifier("IsRight");
export const eitherInformationFieldIdentifier = GoAST.createIdentifier("Information");
export const eitherLeftFieldIdentifier = GoAST.createIdentifier("Left");
export const eitherRightFieldIdentifier = GoAST.createIdentifier("Right");
export const undefinedTypeIdentifier = GoAST.createIdentifier("JSUndefined");

/** Type Go `Either[L, R]` (either.go). */
export const eitherDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "either.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("either.go")],
				),
			},
		],
	}),
);
