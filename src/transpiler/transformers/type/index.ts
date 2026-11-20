import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSTypeTransformers } from "../duplojs";
import { sharedTypeTransformers } from "../shared";
import { float64TypeTransformer } from "./float";
import { numberLiteralTypeTransformer } from "./numberLiteral";
import { parenthesizedTypeTransformer } from "./parenthesized";
import { unionTypeTransformer } from "./union";
import { intersectionTypeTransformer } from "./intersection";
import { functionTypeTransformer } from "./function";
import { promiseTypeTransformer } from "./promise";
import { stringTypeTransformer } from "./string";
import { booleanTypeTransformer } from "./boolean";
import { arrayTypeTransformer } from "./array";
import { homogeneousTupleTypeTransformer } from "./tuple";
import { readonlyTypeTransformer } from "./readonly";
import { nullishTypeTransformer } from "./nullish";
import { typeAliasReferenceTransformer, typeParameterReferenceTransformer } from "./typeAlias";
import { objectTypeLiteralTransformer } from "./object";

export * from "./goTypeOf";

export const typeTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Type | GoAST.TypeReference>[] => [
		typeParameterReferenceTransformer,
		unionTypeTransformer,
		intersectionTypeTransformer,
		promiseTypeTransformer,
		...duploJSTypeTransformers.value,
		...sharedTypeTransformers.value,
		parenthesizedTypeTransformer,
		readonlyTypeTransformer,
		float64TypeTransformer,
		numberLiteralTypeTransformer,
		stringTypeTransformer,
		booleanTypeTransformer,
		arrayTypeTransformer,
		homogeneousTupleTypeTransformer,
		functionTypeTransformer,
		nullishTypeTransformer,
		typeAliasReferenceTransformer,
		objectTypeLiteralTransformer,
	],
);
