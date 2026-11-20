import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import { type BuildContext } from "../../context/build";
import { resolveProjectTypeDeclarations } from "../../resolvedReference";
import { getStructFields, transformObjectMembers, type StructField } from "./object";

/**
 * Alias de type et interfaces DU PROJET (ADR-13, ADR-14), y compris GÉNÉRIQUES
 * (`type Box<T> = { value: T }`, `interface Page<T> extends Base { … }`) :
 * traduits par leur définition, chaque paramètre de type étant SUBSTITUÉ par
 * l'argument du site (ou sa valeur par défaut). Les substitutions forment une
 * pile de portées : l'argument est lui-même traduit dans la portée extérieure.
 */

async function withTypeParameterScope<GenericResult>(
	context: BuildContext,
	scope: ReadonlyMap<string, TsAST.TypeNode>,
	run: () => Promise<GenericResult>,
) {
	const saved = context.transpilation.typeParameterScopes;
	context.transpilation.typeParameterScopes = [...saved, scope];

	try {
		return await run();
	} finally {
		context.transpilation.typeParameterScopes = saved;
	}
}

function createScope(
	typeParameters: readonly TsAST.TypeParameterDeclaration[] | undefined,
	typeArguments: readonly TsAST.TypeNode[] | undefined,
	site: TsAST.Node,
	context: BuildContext,
) {
	const scope = new Map<string, TsAST.TypeNode>();

	for (const [index, parameter] of (typeParameters ?? []).entries()) {
		const argument = typeArguments?.[index] ?? parameter.defaultType;

		if (!argument) {
			return context.error(site, "generic-type-argument-missing");
		}

		scope.set(parameter.name.text, argument);
	}

	return DEither.right("type-parameter-scope", scope);
}

/** `T` dans le corps d'un alias ou d'une interface en cours de développement. */
export const typeParameterReferenceTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		const scopes = context.transpilation.typeParameterScopes;
		const scope = DArray.last(scopes);

		if (
			!scope
			|| !TsAST.isTypeReferenceNode(node)
			|| !TsAST.isIdentifier(node.typeName)
			|| (node.typeArguments && !DArray.lengthEqual(node.typeArguments, 0))
		) {
			return context.notSupport();
		}

		const argument = scope.get(node.typeName.text);

		if (!argument) {
			return context.notSupport();
		}

		// L'argument appartient au site : il se traduit dans la portée extérieure.
		context.transpilation.typeParameterScopes = scopes.slice(0, -1);

		try {
			return await context.transform(argument, typeTransformers.value);
		} finally {
			context.transpilation.typeParameterScopes = scopes;
		}
	},
);

async function transformInterface(
	declarations: readonly TsAST.InterfaceDeclaration[],
	typeArguments: readonly TsAST.TypeNode[] | undefined,
	site: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Type>["transformer"]>> {
	const scope = DEither.unwrapRight(
		createScope(DArray.first(declarations)?.typeParameters, typeArguments, site, context),
	);

	if (DEither.isLeft(scope)) {
		return scope;
	}

	return withTypeParameterScope(context, scope, async() => {
		let fields: readonly Omit<StructField, "identifier">[] = [];

		for (const declaration of declarations) {
			// `extends Base<…>` : les champs de la base d'abord, dans son ordre.
			for (const clause of declaration.heritageClauses ?? []) {
				for (const heritage of clause.types) {
					const base = DEither.unwrapRight(await transformProjectTypeReference(
						TsAST.isExpressionWithTypeArguments(heritage) ? heritage.expression : heritage.typeName,
						heritage.typeArguments,
						heritage,
						context,
					));

					if (DEither.isLeft(base)) {
						return DEither.hasInformation(base, "transformation-not-supported")
							? context.error(heritage, "interface-base-not-supported")
							: base;
					}

					const baseFields = DEither.unwrapRight(getStructFields(base.result));

					if (DEither.isLeft(baseFields)) {
						return context.error(heritage, "interface-base-is-not-an-object");
					}

					fields = [
						...fields.filter((field) => !baseFields.some((baseField) => baseField.name === field.name)),
						...baseFields,
					];
				}
			}

			const struct = DEither.unwrapRight(await transformObjectMembers(declaration.members, context, fields));

			if (DEither.isLeft(struct)) {
				return struct;
			}

			const structFields = DEither.unwrapRight(getStructFields(struct.result));

			fields = DEither.isLeft(structFields) ? fields : structFields;
		}

		return transformObjectMembers([], context, fields);
	});
}

async function transformProjectTypeReference(
	typeName: TsAST.EntityName | TsAST.Expression,
	typeArguments: readonly TsAST.TypeNode[] | undefined,
	site: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Type | GoAST.TypeReference>["transformer"]>> {
	const declarations = DEither.unwrapRight(await resolveProjectTypeDeclarations(typeName, context));

	if (DEither.isLeft(declarations)) {
		return context.notSupport();
	}

	const alias = declarations.find((declaration) => TsAST.isTypeAliasDeclaration(declaration));

	if (alias && TsAST.isTypeAliasDeclaration(alias)) {
		const scope = DEither.unwrapRight(createScope(alias.typeParameters, typeArguments, site, context));

		if (DEither.isLeft(scope)) {
			return scope;
		}

		return withTypeParameterScope(context, scope, () => context.transform(alias.type, typeTransformers.value));
	}

	return transformInterface(
		declarations.filter((declaration) => TsAST.isInterfaceDeclaration(declaration)),
		typeArguments,
		site,
		context,
	);
}

export const typeAliasReferenceTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTypeReferenceNode(node)) {
			return context.notSupport();
		}

		return DCommon.cast(await transformProjectTypeReference(node.typeName, node.typeArguments, node, context));
	},
);
