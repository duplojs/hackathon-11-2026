import * as DArray from "@duplojs/lang/array";
import { GoAST } from "@go";
import { createSharedDependency, type SharedDependency } from "@transformer";

export const unionTagIdentifier = GoAST.createIdentifier("Tag");

export function createUnionTypeIdentifier(arity: number) {
	return GoAST.createIdentifier(`Union${arity}`);
}

export function createUnionValueIdentifier(index: number) {
	return GoAST.createIdentifier(`V${index}`);
}

// Une dépendance par arité : la déduplication du set global repose sur l'identité des objets.
const unionDependencies = new Map<number, SharedDependency>();

export function getUnionDependency(arity: number) {
	const cached = unionDependencies.get(arity);

	if (cached) {
		return cached;
	}

	const typeParameters = DArray.map(
		DArray.from({ length: arity }),
		(_element, { index }) => GoAST.createTypeParameter({
			identifier: GoAST.createIdentifier(`T${index}`),
			constraint: GoAST.builtinTypeReferences.any,
		}),
	);

	const dependency = createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeAlias({
				identifier: createUnionTypeIdentifier(arity),
				generic: typeParameters,
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: unionTagIdentifier,
							typeReference: GoAST.builtinTypeReferences.uint8,
						}),
						...DArray.map(
							typeParameters,
							(typeParameter, { index }) => GoAST.createStructField({
								identifier: createUnionValueIdentifier(index),
								typeReference: typeParameter.identifier,
							}),
						),
					],
				}),
			}),
		],
	});

	unionDependencies.set(arity, dependency);

	return dependency;
}
