import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSDeclarationTransformers } from "../duplojs";

export const declarationTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Declaration>[] => [...duploJSDeclarationTransformers.value],
);
