import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { type BuildContext } from "../../../../context/build";
import { typeTransformers } from "../../../type";
import { eitherDependency, eitherTypeIdentifier, undefinedTypeIdentifier } from "../sharedDependency";

/** Un membre d'union reconnu comme type Either DuploJS. */
export interface EitherTypeMember {
	readonly node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode;
	readonly exportName: string;
}

type GoType = GoAST.Type | GoAST.TypeReference;

/** Reconnaît un type Either DuploJS : une variante seule ou une union de variantes. */
export async function resolveEitherTypeMember(
	member: TsAST.TypeNode,
	context: BuildContext,
): Promise<EitherTypeMember | undefined> {
	if (!TsAST.isTypeReferenceNode(member) && !TsAST.isImportTypeNode(member)) {
		return undefined;
	}

	const moduleReference = await DCommon.asyncPipe(
		context.resolveReferenceModule(
			TsAST.isTypeReferenceNode(member) ? member.typeName : member,
			"@duplojs/lang",
			/^dist\/either\//,
		),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(moduleReference)) {
		return undefined;
	}

	return {
		node: member,
		exportName: moduleReference.symbol.name,
	};
}

export interface EitherMemberSide {
	readonly side: "left" | "right";

	/** "success", "fail" ou l'information de Left ; undefined si le type ne la fixe pas. */
	readonly information: string | undefined;

	/** Type TS de la valeur ; undefined si pas de valeur. */
	readonly value: TsAST.TypeNode | undefined;
}

/** Type littéral `"x"` -> x ; sinon undefined. */
function readLiteralInformation(typeNode: TsAST.TypeNode | undefined) {
	if (
		typeNode
		&& TsAST.isLiteralTypeNode(typeNode)
		&& TsAST.isStringLiteral(typeNode.literal)
	) {
		return typeNode.literal.text;
	}

	return undefined;
}

/** Côté et type de valeur de chaque type Either géré. Absent de la table : erreur. */
export function describeEitherMember(member: EitherTypeMember): EitherMemberSide | undefined {
	return DCommon.pipe(
		member.exportName,
		DPattern.match(
			DCommon.equal("Success"),
			(): EitherMemberSide => ({
				side: "right",
				information: "success",
				value: member.node.typeArguments && DArray.first(member.node.typeArguments),
			}),
		),
		DPattern.match(
			DCommon.equal("Fail"),
			(): EitherMemberSide => ({
				side: "left",
				information: "fail",
				value: undefined,
			}),
		),
		// Left<information, valeur>. `Left<"x">` sans valeur : non géré.
		DPattern.match(
			DCommon.equal("Left"),
			(): EitherMemberSide | undefined => {
				const [information, value] = member.node.typeArguments ?? [];

				if (!value) {
					return undefined;
				}

				return {
					side: "left",
					information: readLiteralInformation(information),
					value,
				};
			},
		),
		DPattern.otherwise(() => undefined),
	);
}

function removeDuplicateGoTypes(goTypes: readonly GoType[]): readonly GoType[] {
	const rendered = DArray.map(goTypes, (goType) => GoPrinter.renderNode(goType));

	return DArray.filter(
		goTypes,
		(goType, { index }) => DArray.indexOf(rendered, GoPrinter.renderNode(goType)) === index,
	);
}

/**
 * Type Either TS -> `Either[L, R]` : L = valeurs Left, R = valeurs Right,
 * JSUndefined si un côté n'a pas de valeur. Deux types Go d'un même côté : erreur.
 */
export async function eitherTypeHandler(
	node: TsAST.TypeNode,
	members: readonly EitherTypeMember[],
	context: BuildContext,
) {
	const packageName = context.registerSharedDependency(eitherDependency.value);
	const undefinedType: GoType = GoAST.createPackageTypeReference({
		packageName,
		identifier: undefinedTypeIdentifier,
	});

	const sides = await DCommon.asyncPipe(
		members,
		DArray.map(
			async(member) => {
				const description = describeEitherMember(member);

				if (!description) {
					return context.error(member.node, "either-type-not-supported-yet");
				}

				if (!description.value) {
					return DEither.right("either-member-side", {
						side: description.side,
						goType: undefinedType,
					});
				}

				const value = await DCommon.asyncPipe(
					context.transform(description.value, typeTransformers.value),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(value)) {
					return value;
				}

				if (!DArray.lengthEqual(value.before, 0)) {
					return context.error(description.value, "un-support-before-on-type");
				}

				return DEither.right("either-member-side", {
					side: description.side,
					goType: value.result,
				});
			},
		),
		DCommon.promiseAll,
	);

	const failedSide = DArray.find(sides, DEither.isLeft);

	if (failedSide) {
		return failedSide;
	}

	const resolvedSides = DArray.map(
		DArray.filter(sides, DEither.isRight),
		DEither.unwrapRight,
	);

	const goTypesOfSide = (side: EitherMemberSide["side"]) => removeDuplicateGoTypes(
		DArray.map(
			DArray.filter(resolvedSides, (resolvedSide) => resolvedSide.side === side),
			(resolvedSide) => resolvedSide.goType,
		),
	);

	const leftTypes = goTypesOfSide("left");
	const rightTypes = goTypesOfSide("right");

	if (leftTypes.length > 1 || rightTypes.length > 1) {
		return context.error(node, {
			reason: "either-side-with-several-go-types",
			left: DArray.map(leftTypes, (goType) => GoPrinter.renderNode(goType)),
			right: DArray.map(rightTypes, (goType) => GoPrinter.renderNode(goType)),
		});
	}

	return context.success({
		result: GoAST.createGenericTypeReference({
			typeReference: GoAST.createPackageTypeReference({
				packageName,
				identifier: eitherTypeIdentifier,
			}),
			typeArguments: DCommon.cast([
				DArray.first(leftTypes) ?? undefinedType,
				DArray.first(rightTypes) ?? undefinedType,
			]),
		}),
	});
}
