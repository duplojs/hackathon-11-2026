import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";
import { goBuilder as go } from "../../type/goBuilder";
import {
	either2TypeIdentifier,
	eitherKindIdentifiers,
	eitherTypeIdentifier,
} from "./sharedDependency";

/**
 * Conversions d'Either (ADR-13), émises seulement si elles servent : un projet
 * qui n'en a pas besoin garde exactement le même shard_dependencies.go.
 *
 * Chaque côté est converti par une fonction passée en argument (`left`, `right`).
 * Le transpileur la construit d'après les TYPES GO (coercition récursive : valeur
 * vers union étiquetée, union vers membre…). Ces fonctions sont de petits `func`
 * literal : Go les inline avec la fonction générique.
 */
export const eitherMapFunctionIdentifier = GoAST.createIdentifier("EitherMap");
export const either2FromEitherFunctionIdentifier = GoAST.createIdentifier("Either2FromEither");
export const either2MapFunctionIdentifier = GoAST.createIdentifier("Either2Map");
export const either2LeftOfFunctionIdentifier = GoAST.createIdentifier("Either2LeftOf");
export const either2FailOfFunctionIdentifier = GoAST.createIdentifier("Either2FailOf");
export const either2PlainOfFunctionIdentifier = GoAST.createIdentifier("Either2PlainOf");

export const eitherConversionDependency = DCommon.memo(() => {
	const id = go.identifier;
	const kind = id("Kind");
	const information = id("Information");
	const valueField = id("Value");
	const leftField = id("Left");
	const rightField = id("Right");
	const source = id("source");
	const leftConvert = id("left");
	const rightConvert = id("right");
	const value = id("value");
	const informationArgument = id("information");

	const parameters = (...names: readonly string[]) => names.map((name) => go.typeParameter(id(name)));
	const eitherOf = (valueType: GoAST.Identifier) => go.genericType(eitherTypeIdentifier, [valueType]);
	const either2Of = (left: GoAST.Identifier, right: GoAST.Identifier) => go.genericType(
		either2TypeIdentifier,
		[left, right],
	);
	const convert = (target: GoAST.Identifier, from: GoAST.Identifier, to: GoAST.Identifier) => go.argument(
		target,
		go.functionType([from], to),
	);
	const either2Literal = (
		type: ReturnType<typeof either2Of>,
		kindValue: GoAST.Expression,
		informationValue: GoAST.Expression,
		side: readonly [GoAST.Identifier, GoAST.Expression] | undefined,
	) => go.struct(type, [
		[kind, kindValue],
		[information, informationValue],
		...(side ? [side] : []),
	]);
	const sourceKind = go.select(source, kind);
	const sourceInformation = go.select(source, information);
	const isLeft = go.call(go.select(source, id("IsLeft")), []);

	const [to, from] = [id("To"), id("From")];
	const [leftType, rightType, valueType] = [id("L"), id("R"), id("V")];
	const [fromLeftType, fromRightType] = [id("FL"), id("FR")];

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			// EitherMap[To, From](source, convert) : même variante, valeur convertie.
			GoAST.createFunctionDeclaration({
				identifier: eitherMapFunctionIdentifier,
				generic: parameters("To", "From"),
				arguments: [go.argument(source, eitherOf(from)), convert(id("convert"), from, to)],
				returnTypes: [eitherOf(to)],
				body: go.block([
					go.return(go.struct(eitherOf(to), [
						[kind, sourceKind],
						[information, sourceInformation],
						[valueField, go.call(id("convert"), [go.select(source, valueField)])],
					])),
				]),
			}),
			// Either2FromEither[L, R, V](source, left, right).
			GoAST.createFunctionDeclaration({
				identifier: either2FromEitherFunctionIdentifier,
				generic: parameters("L", "R", "V"),
				arguments: [
					go.argument(source, eitherOf(valueType)),
					convert(leftConvert, valueType, leftType),
					convert(rightConvert, valueType, rightType),
				],
				returnTypes: [either2Of(leftType, rightType)],
				body: go.block([
					go.if(isLeft, [
						go.return(either2Literal(either2Of(leftType, rightType), sourceKind, sourceInformation, [
							leftField,
							go.call(leftConvert, [go.select(source, valueField)]),
						])),
					]),
					go.return(either2Literal(either2Of(leftType, rightType), sourceKind, sourceInformation, [
						rightField,
						go.call(rightConvert, [go.select(source, valueField)]),
					])),
				]),
			}),
			// Either2Map[L, R, FL, FR](source, left, right).
			GoAST.createFunctionDeclaration({
				identifier: either2MapFunctionIdentifier,
				generic: parameters("L", "R", "FL", "FR"),
				arguments: [
					go.argument(source, either2Of(fromLeftType, fromRightType)),
					convert(leftConvert, fromLeftType, leftType),
					convert(rightConvert, fromRightType, rightType),
				],
				returnTypes: [either2Of(leftType, rightType)],
				body: go.block([
					go.if(isLeft, [
						go.return(either2Literal(either2Of(leftType, rightType), sourceKind, sourceInformation, [
							leftField,
							go.call(leftConvert, [go.select(source, leftField)]),
						])),
					]),
					go.return(either2Literal(either2Of(leftType, rightType), sourceKind, sourceInformation, [
						rightField,
						go.call(rightConvert, [go.select(source, rightField)]),
					])),
				]),
			}),
			GoAST.createFunctionDeclaration({
				identifier: either2LeftOfFunctionIdentifier,
				generic: parameters("L", "R"),
				arguments: [
					go.argument(informationArgument, GoAST.builtinTypeReferences.string),
					go.argument(value, leftType),
				],
				returnTypes: [either2Of(leftType, rightType)],
				body: go.block([
					go.return(either2Literal(
						either2Of(leftType, rightType),
						eitherKindIdentifiers.left,
						informationArgument,
						[
							leftField,
							value,
						],
					)),
				]),
			}),
			GoAST.createFunctionDeclaration({
				identifier: either2FailOfFunctionIdentifier,
				generic: parameters("L", "R"),
				arguments: [],
				returnTypes: [either2Of(leftType, rightType)],
				body: go.block([
					go.return(either2Literal(
						either2Of(leftType, rightType),
						eitherKindIdentifiers.fail,
						GoAST.createStringLiteral({ value: "fail" }),
						undefined,
					)),
				]),
			}),
			GoAST.createFunctionDeclaration({
				identifier: either2PlainOfFunctionIdentifier,
				generic: parameters("L", "R"),
				arguments: [go.argument(value, rightType)],
				returnTypes: [either2Of(leftType, rightType)],
				body: go.block([
					go.return(either2Literal(either2Of(leftType, rightType), eitherKindIdentifiers.plain, GoAST.createStringLiteral({ value: "" }), [
						rightField,
						value,
					])),
				]),
			}),
		],
	});
});
