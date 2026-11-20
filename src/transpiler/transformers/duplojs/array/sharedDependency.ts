import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const coalescingFunctionIdentifier = GoAST.createIdentifier("Coalescing");
export const coalescingArrayFunctionIdentifier = GoAST.createIdentifier("CoalescingArray");

/** Fonction Go de `DArray.coalescing`, écrite à la main dans coalescing.go (décision n°8). */
export const coalescingDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "array_coalescing.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("coalescing.go")],
				),
			},
		],
	}),
);
