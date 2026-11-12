import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSDeclarationTransformers } from "../duplojs";
import { sharedDeclarationTransformers } from "../shared";
import { functionDeclarationTransformer } from "./function";

export const declarationTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Declaration>[] => [
		...duploJSDeclarationTransformers.value,
		...sharedDeclarationTransformers.value,
		functionDeclarationTransformer,
	],
);
