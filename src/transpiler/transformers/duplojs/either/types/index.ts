import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { type GoAST } from "@go";
import { type TsAST } from "@typescript";
import { type Transformer } from "@transformer";
import { type BuildContext } from "../../../../context/build";
import { typeTransformers } from "../../../type";
import { eitherDependency } from "../sharedDependency";
import { createEitherGoType, createEitherNoValueGoType } from "../goType";

export const eitherTypeNames = ["Success", "Fail", "Left", "Right"] as const;

export type EitherTypeName = typeof eitherTypeNames[number];

export interface EitherTypeMember {
	readonly name: EitherTypeName;
	readonly node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode;
}

// Position de l'argument de type qui porte la valeur : Success<V>, Left<I, V>, Right<I, V>.
// Fail (= Left<"fail", void>) ne porte pas de valeur.
function getValueTypeNode(member: EitherTypeMember) {
	return DCommon.pipe(
		member.name,
		DPattern.match(
			DCommon.equal("Fail"),
			() => DEither.left("no-value-type"),
		),
		DPattern.match(
			DCommon.equal("Success"),
			() => DEither.right(
				"value-type-node",
				member.node.typeArguments && DArray.at(member.node.typeArguments, 0),
			),
		),
		DPattern.otherwise(
			() => DEither.right(
				"value-type-node",
				member.node.typeArguments && DArray.at(member.node.typeArguments, 1),
			),
		),
	);
}

/**
 * Traduit UN type Either (Success<V>, Fail, Left<I, V>, Right<I, V>) en Either[V].
 * Fail seul donne Either[JSUndefined]. Les unions sont regroupées par
 * type/union.ts (règle de l'ADR-2), qui s'appuie sur ce résultat.
 */
export async function eitherTypeHandler(
	member: EitherTypeMember,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.GenericTypeReference>["transformer"]>> {
	const valueTypeNode = DEither.unwrapRight(getValueTypeNode(member));

	if (DEither.isLeft(valueTypeNode)) {
		const packageName = context.registerSharedDependency(eitherDependency.value);

		return context.success({
			result: createEitherGoType(packageName, createEitherNoValueGoType(packageName)),
		});
	}

	if (!valueTypeNode) {
		return context.error(member.node, "missing-either-value-type");
	}

	const valueType = await DCommon.asyncPipe(
		context.transform(valueTypeNode, typeTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(valueType)) {
		return valueType;
	}

	if (!DArray.lengthEqual(valueType.before, 0)) {
		return context.error(valueTypeNode, "un-support-before-on-either-value-type");
	}

	const packageName = context.registerSharedDependency(eitherDependency.value);

	return context.success({
		result: createEitherGoType(packageName, valueType.result),
	});
}
