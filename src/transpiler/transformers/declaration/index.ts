import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "../../factory";
import type * as GO from "@go";
import { duploJSDeclarationTransformers } from "../duplojs";

export const declarationTransformers = DCommon.memo(
	(): readonly Transformer<GO.AST.Declaration>[] => [...duploJSDeclarationTransformers.value],
);
