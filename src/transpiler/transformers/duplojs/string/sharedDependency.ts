import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const stringToFunctionIdentifier = GoAST.createIdentifier("StringTo");

/** Fonction Go de `DString.to`, écrite à la main dans to.go (décision n°8). Utilise formatNumber de print.go. */
export const stringToDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "string_to.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("to.go")],
				),
			},
		],
	}),
);
