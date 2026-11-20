import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST, GoPrinter } from "@go";
import { type GoType } from "../../type/goTypeOf";
import {
	either2TypeIdentifier,
	eitherNoValueIdentifier,
	eitherTypeIdentifier,
} from "./sharedDependency";

export interface Either2GoTypes {
	readonly leftType: GoType;
	readonly rightType: GoType;
}

export interface EitherValueAccess {
	readonly valueType: GoType;
	readonly field: GoAST.Identifier;
}

/**
 * Si `goType` est `shard_dependencies.Either[V]`, renvoie `some(V)`.
 * Reconnaît notre propre nœud Go (identité de l'identifiant), pas un texte.
 */
export function getEitherValueGoType(goType: GoType): DEither.Maybe<GoType> {
	const access = DEither.unwrapRight(getEitherValueAccess(goType));

	return DEither.isLeft(access)
		? DEither.none()
		: DEither.some(access.valueType);
}

export function getEitherValueAccess(goType: GoType): DEither.Maybe<EitherValueAccess> {
	if (
		!DModeling.hasTagValue(goType, "[node]type-reference-generic")
		|| !DModeling.hasTagValue(goType.typeReference, "[node]type-reference-package")
	) {
		return DEither.none();
	}

	if (goType.typeReference.identifier === eitherTypeIdentifier) {
		const valueType = DArray.first(goType.typeArguments);

		return valueType
			? DEither.some({
				valueType,
				field: GoAST.createIdentifier("Value"),
			})
			: DEither.none();
	}

	if (goType.typeReference.identifier === either2TypeIdentifier) {
		const rightType = DArray.at(goType.typeArguments, 1);

		return rightType
			? DEither.some({
				valueType: rightType,
				field: GoAST.createIdentifier("Right"),
			})
			: DEither.none();
	}

	return DEither.none();
}

export function getEither2GoTypes(goType: GoType): DEither.Maybe<Either2GoTypes> {
	if (
		!DModeling.hasTagValue(goType, "[node]type-reference-generic")
		|| !DModeling.hasTagValue(goType.typeReference, "[node]type-reference-package")
		|| goType.typeReference.identifier !== either2TypeIdentifier
	) {
		return DEither.none();
	}

	const leftType = DArray.at(goType.typeArguments, 0);
	const rightType = DArray.at(goType.typeArguments, 1);

	return leftType && rightType
		? DEither.some({
			leftType,
			rightType,
		})
		: DEither.none();
}

/** V = JSUndefined : la variante (Fail) ne porte aucune valeur. */
export function isEitherNoValueGoType(valueType: GoType) {
	return DModeling.hasTagValue(valueType, "[node]type-reference-package")
		&& valueType.identifier === eitherNoValueIdentifier;
}

export function createEitherGoType(packageName: GoAST.Identifier, valueType: GoType) {
	return GoAST.createGenericTypeReference({
		typeReference: GoAST.createPackageTypeReference({
			packageName,
			identifier: eitherTypeIdentifier,
		}),
		typeArguments: DCommon.cast([valueType]),
	});
}

export function createEither2GoType(
	packageName: GoAST.Identifier,
	leftType: GoType,
	rightType: GoType,
) {
	return GoAST.createGenericTypeReference({
		typeReference: GoAST.createPackageTypeReference({
			packageName,
			identifier: either2TypeIdentifier,
		}),
		typeArguments: DCommon.cast([leftType, rightType]),
	});
}

export function createEitherNoValueGoType(packageName: GoAST.Identifier) {
	return GoAST.createPackageTypeReference({
		packageName,
		identifier: eitherNoValueIdentifier,
	});
}

/**
 * Union de deux types Go selon la règle de l'ADR-2 (regroupement par type Go) :
 * identiques : ce type ; Either[V] et Either[JSUndefined] (sans valeur) : Either[V] ;
 * Either[V] et V nu : Either[V] ; Either sans valeur et T nu : Either[T] ;
 * sinon `undefined` (non représentable sans union fermée).
 */
export function unionGoTypes(left: GoType, right: GoType, packageName: GoAST.Identifier): GoType | undefined {
	const render = (goType: GoType) => GoPrinter.renderNode(goType);

	if (render(left) === render(right)) {
		return left;
	}

	const leftValue = DEither.unwrapRight(getEitherValueGoType(left));
	const rightValue = DEither.unwrapRight(getEitherValueGoType(right));

	if (!DEither.isLeft(leftValue) && !DEither.isLeft(rightValue)) {
		if (isEitherNoValueGoType(leftValue)) {
			return right;
		}

		return isEitherNoValueGoType(rightValue) ? left : undefined;
	}

	const [eitherValue, plain] = DEither.isLeft(leftValue)
		? [rightValue, left]
		: [leftValue, right];

	if (DEither.isLeft(eitherValue)) {
		return undefined;
	}

	if (isEitherNoValueGoType(eitherValue)) {
		return createEitherGoType(packageName, plain);
	}

	return render(eitherValue) === render(plain)
		? createEitherGoType(packageName, plain)
		: undefined;
}
