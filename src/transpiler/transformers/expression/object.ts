import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { expressionTransformers } from ".";
import { type BuildContext } from "../../context/build";
import { coerceGoExpression } from "../duplojs/either/coerce";
import { goBuilder as go } from "../type/goBuilder";
import { goTypeOf, goTypeOfExpression, type GoType } from "../type/goTypeOf";
import { createUndefinedGoType, getStructFields } from "../type/object";
import {
	canNarrowUnion,
	createUnionValue,
	findUnionMemberIndex,
	getUnionMemberGoTypes,
	narrowUnionExpression,
	renderGoType,
	unionTagField,
	unionValueField,
} from "../type/taggedUnion";

/**
 * Expressions sur les objets (ADR-14) : littéral `{ … }` (avec spread),
 * `a.b`, `a["b"]`, `a.length`, `a[i]`.
 */

const utf16ImportDeclaration = GoAST.createImportDeclaration({ path: "unicode/utf16" });

async function goTypeOrUndefined(node: TsAST.Expression, context: BuildContext) {
	const goType = DEither.unwrapRight(await goTypeOfExpression(node, context));

	return DEither.isLeft(goType) ? undefined : goType.result;
}

async function transformToTemporary(node: TsAST.Expression, context: BuildContext) {
	const transformed = await DCommon.asyncPipe(
		context.transform(node, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(transformed)) {
		return transformed;
	}

	const temporary = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: transformed.result,
	});

	return DEither.right("temporary", {
		before: DArray.concat(transformed.before, [temporary]),
		identifier: temporary.identifier,
	});
}

async function coerceOrKeep(
	expression: GoAST.Expression,
	fromGoType: GoType,
	toGoType: GoType,
	context: BuildContext,
) {
	if (renderGoType(fromGoType) === renderGoType(toGoType)) {
		return expression;
	}

	const coerced = await coerceGoExpression({
		expression,
		fromGoType,
		toGoType,
	}, context);

	return DEither.isLeft(coerced) ? undefined : DEither.unwrapRight(coerced).result;
}

function getPropertyName(name: TsAST.PropertyName) {
	if (TsAST.isIdentifier(name) || TsAST.isStringLiteral(name) || TsAST.isNumericLiteral(name)) {
		return name.text;
	}

	return undefined;
}

interface FieldValue {
	readonly expression: GoAST.Expression;
	readonly goType: GoType;
}

/**
 * `{ a: x, b, ...rest }` : chaque valeur est évaluée DANS L'ORDRE DU LITTÉRAL
 * (ordre JS), puis la struct est construite dans l'ordre des champs du type.
 * Le littéral prend son PROPRE type ; les frontières (retour, argument,
 * variable…) le convertissent vers le type attendu (champ optionnel absent…).
 */
export const objectLiteralTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isObjectLiteralExpression(node)) {
			return context.notSupport();
		}

		const { typeChecker } = context.transpilation;
		const ownGoType = DEither.unwrapRight(await goTypeOf(await typeChecker.getTypeAtLocation(node), node, context));

		if (DEither.isLeft(ownGoType)) {
			return ownGoType;
		}

		const fields = DEither.unwrapRight(getStructFields(ownGoType.result));

		if (DEither.isLeft(fields)) {
			return context.error(node, "object-literal-type-is-not-a-struct");
		}

		let before: readonly GoAST.Statement[] = [];
		const values = new Map<string, FieldValue>();

		for (const property of node.properties) {
			if (TsAST.isSpreadAssignment(property)) {
				const sourceGoType = await goTypeOrUndefined(property.expression, context);
				const sourceFields = sourceGoType && DEither.unwrapRight(getStructFields(sourceGoType));

				if (!sourceFields || DEither.isLeft(sourceFields)) {
					return context.error(property, "object-spread-source-is-not-an-object");
				}

				const source = DEither.unwrapRight(await transformToTemporary(property.expression, context));

				if (DEither.isLeft(source)) {
					return source;
				}

				before = DArray.concat(before, source.before);

				for (const field of sourceFields) {
					values.set(field.name, {
						expression: go.select(source.identifier, field.identifier),
						goType: field.goType,
					});
				}

				continue;
			}

			const isShorthand = TsAST.isShorthandPropertyAssignment(property);
			const name = (TsAST.isPropertyAssignment(property) || isShorthand)
				? getPropertyName(property.name)
				: undefined;

			if (name === undefined) {
				return context.error(property, "object-literal-member-not-supported");
			}

			const valueNode: TsAST.Expression = TsAST.isShorthandPropertyAssignment(property)
				? property.name as TsAST.Identifier
				: (property as TsAST.PropertyAssignment).initializer;
			const valueGoType = await goTypeOrUndefined(valueNode, context);
			const value = DEither.unwrapRight(await transformToTemporary(valueNode, context));

			if (DEither.isLeft(value)) {
				return value;
			}

			if (!valueGoType) {
				return context.error(valueNode, "object-literal-value-type-not-supported");
			}

			before = DArray.concat(before, value.before);
			values.set(name, {
				expression: value.identifier,
				goType: valueGoType,
			});
		}

		const elements: (readonly [GoAST.Identifier, GoAST.Expression])[] = [];

		for (const field of fields) {
			const value = values.get(field.name);

			if (!value) {
				if (!field.optional) {
					return context.error(node, {
						code: "object-literal-missing-property",
						property: field.name,
					});
				}

				continue;
			}

			const coerced = await coerceOrKeep(value.expression, value.goType, field.goType, context);

			if (!coerced) {
				return context.error(node, {
					code: "object-literal-property-type-not-supported",
					property: field.name,
				});
			}

			elements.push([field.identifier, coerced]);
		}

		return context.success({
			before,
			result: go.struct(ownGoType.result, elements),
		});
	},
);

/**
 * Lecture d'un champ sur une valeur Go `expression` de type `goType` :
 * struct (`x.P_name`), union de structs (champ commun : lecture par étiquette),
 * `length` d'un slice ou d'une chaîne.
 */
async function readProperty(params: {
	readonly expression: GoAST.Expression;
	readonly goType: GoType;
	readonly name: string;
	readonly resultGoType: GoType | undefined;
	readonly site: TsAST.Node;
	readonly context: BuildContext;
}): Promise<GoAST.Expression | undefined> {
	const { expression, goType, name, resultGoType, context } = params;
	const fields = DEither.unwrapRight(getStructFields(goType));

	if (!DEither.isLeft(fields)) {
		const field = fields.find((known) => known.name === name);

		if (!field) {
			return undefined;
		}

		const read = go.select(expression, field.identifier);

		return resultGoType ? coerceOrKeep(read, field.goType, resultGoType, context) : read;
	}

	if (name === "length" && DModeling.hasTagValue(goType, "[node][type]slice")) {
		return GoAST.createConversionExpression({
			typeReference: GoAST.builtinTypeReferences.float64,
			operand: go.call(GoAST.createIdentifier("len"), [expression]),
		});
	}

	if (name === "length" && renderGoType(goType) === "string") {
		// JS compte les unités UTF-16, pas les octets.
		context.file.imports.add(utf16ImportDeclaration);

		return GoAST.createConversionExpression({
			typeReference: GoAST.builtinTypeReferences.float64,
			operand: go.call(GoAST.createIdentifier("len"), [
				go.call(go.select(GoAST.createIdentifier("utf16"), GoAST.createIdentifier("Encode")), [
					GoAST.createConversionExpression({
						typeReference: GoAST.createSliceType({ elementType: GoAST.builtinTypeReferences.rune }),
						operand: expression,
					}),
				]),
			]),
		});
	}

	const members = DEither.unwrapRight(getUnionMemberGoTypes(goType));

	if (DEither.isLeft(members) || !resultGoType) {
		return undefined;
	}

	// Champ commun à tous les membres (union discriminée : `shape.kind`).
	const parameter = context.generateIdentifier();
	const statements: GoAST.Statement[] = [];

	for (const [index, member] of members.entries()) {
		const read = await readProperty({
			...params,
			expression: go.select(parameter, unionValueField(index)),
			goType: member,
		});

		if (!read) {
			return undefined;
		}

		statements.push(
			index === members.length - 1
				? go.return(read)
				: go.if(go.equal(go.select(parameter, unionTagField), go.integer(index)), [go.return(read)]),
		);
	}

	return go.call(
		go.functionLiteral([go.argument(parameter, goType)], resultGoType, statements),
		[expression],
	);
}

async function transformPropertyRead(
	node: TsAST.Expression,
	objectNode: TsAST.Expression,
	name: string,
	context: BuildContext,
) {
	const objectGoType = await goTypeOrUndefined(objectNode, context);

	if (!objectGoType) {
		return context.notSupport();
	}

	const isKnownShape = !DEither.isLeft(getStructFields(objectGoType))
		|| !DEither.isLeft(getUnionMemberGoTypes(objectGoType))
		|| (name === "length" && (
			DModeling.hasTagValue(objectGoType, "[node][type]slice") || renderGoType(objectGoType) === "string"
		));

	if (!isKnownShape) {
		return context.notSupport();
	}

	const object = await DCommon.asyncPipe(
		context.transform(objectNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(object)) {
		return object;
	}

	const resultGoType = await goTypeOrUndefined(node, context);
	const read = await readProperty({
		expression: object.result,
		goType: objectGoType,
		name,
		resultGoType,
		site: node,
		context,
	});

	return read
		? context.success({
			before: object.before,
			result: read,
		})
		: context.error(node, {
			code: "property-read-not-supported",
			property: name,
		});
}

export const propertyAccessTransformer: Transformer<GoAST.Expression> = createTransformer(
	(node, context) => {
		if (!TsAST.isPropertyAccessExpression(node) || !TsAST.isIdentifier(node.name)) {
			return context.notSupport();
		}

		if (node.questionDotToken) {
			return context.error(node, "optional-chaining-not-supported");
		}

		return transformPropertyRead(node, node.expression, node.name.text, context);
	},
);

/** `a["b"]` (champ) et `a[i]` (élément d'un slice : index entier). */
export const elementAccessTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isElementAccessExpression(node)) {
			return context.notSupport();
		}

		if (TsAST.isStringLiteral(node.argumentExpression)) {
			return transformPropertyRead(node, node.expression, node.argumentExpression.text, context);
		}

		const objectGoType = await goTypeOrUndefined(node.expression, context);

		if (!objectGoType || !DModeling.hasTagValue(objectGoType, "[node][type]slice")) {
			return context.notSupport();
		}

		const object = DEither.unwrapRight(await transformToTemporary(node.expression, context));

		if (DEither.isLeft(object)) {
			return object;
		}

		const index = DEither.unwrapRight(await transformToTemporary(node.argumentExpression, context));

		if (DEither.isLeft(index)) {
			return index;
		}

		const read = GoAST.createIndexExpression({
			target: object.identifier,
			index: GoAST.createConversionExpression({
				typeReference: GoAST.builtinTypeReferences.int,
				operand: index.identifier,
			}),
		});
		const before = DArray.concat(object.before, index.before);
		const resultGoType = await goTypeOrUndefined(node, context);
		const resultMembers = resultGoType && DEither.unwrapRight(getUnionMemberGoTypes(resultGoType));

		const elementGoType = objectGoType.elementType as GoType;

		if (
			!resultGoType
			|| !resultMembers
			|| DEither.isLeft(resultMembers)
			|| canNarrowUnion(elementGoType, resultGoType)
		) {
			// Tuple hétérogène : l'élément lu à une position connue est rétréci.
			const narrowed = resultGoType && canNarrowUnion(elementGoType, resultGoType)
				? narrowUnionExpression(read, elementGoType, resultGoType, context)
				: undefined;

			return context.success({
				before,
				result: narrowed && !DEither.isLeft(narrowed) ? DEither.unwrapRight(narrowed).result : read,
			});
		}

		// `noUncheckedIndexedAccess` : le type est `T | undefined`. Hors limites (ou
		// index non entier), JS rend undefined : l'accès est donc borné.
		const undefinedIndex = findUnionMemberIndex(resultMembers, createUndefinedGoType(context));
		const value = await coerceOrKeep(read, objectGoType.elementType as GoType, resultGoType, context);

		if (undefinedIndex < 0 || !value) {
			return context.error(node, "element-access-type-not-supported");
		}

		const inBounds = [
			GoAST.createBinaryExpression({
				operator: ">=",
				left: index.identifier,
				right: GoAST.createFloatLiteral({ value: "0" }),
			}),
			GoAST.createBinaryExpression({
				operator: "<",
				left: index.identifier,
				right: GoAST.createConversionExpression({
					typeReference: GoAST.builtinTypeReferences.float64,
					operand: go.call(GoAST.createIdentifier("len"), [object.identifier]),
				}),
			}),
			go.equal(
				index.identifier,
				GoAST.createConversionExpression({
					typeReference: GoAST.builtinTypeReferences.float64,
					operand: GoAST.createConversionExpression({
						typeReference: GoAST.builtinTypeReferences.int,
						operand: index.identifier,
					}),
				}),
			),
		].reduce((left, right) => GoAST.createBinaryExpression({
			operator: "&&",
			left,
			right,
		}));
		const result = context.generateIdentifier();

		return context.success({
			before: [
				...before,
				GoAST.createVariableDeclarationZeroValue({
					identifier: result,
					typeReference: DCommon.cast(resultGoType),
				}),
				go.if(
					inBounds,
					[
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([result]),
							values: DCommon.cast([value]),
						}),
					],
					[
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([result]),
							values: DCommon.cast([
								createUnionValue(resultGoType, undefinedIndex, GoAST.createStructLiteral({
									typeReference: createUndefinedGoType(context),
									elements: [],
								})),
							]),
						}),
					],
				),
			],
			result,
		});
	},
);

/**
 * `x!` et `x as T` : aucune opération à l'exécution en JS. En Go, la valeur est
 * rétrécie (union vers membre) ou convertie vers le type annoncé.
 */
export const typeAssertionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isNonNullExpression(node) && !TsAST.isAsExpression(node) && !TsAST.isSatisfiesExpression(node)) {
			return context.notSupport();
		}

		const inner = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(inner)) {
			return inner;
		}

		const innerGoType = await goTypeOrUndefined(node.expression, context);
		const resultGoType = await goTypeOrUndefined(node, context);

		if (!innerGoType || !resultGoType || renderGoType(innerGoType) === renderGoType(resultGoType)) {
			return context.success(inner);
		}

		const narrowed = canNarrowUnion(innerGoType, resultGoType)
			? narrowUnionExpression(inner.result, innerGoType, resultGoType, context)
			: await coerceGoExpression({
				expression: inner.result,
				fromGoType: innerGoType,
				toGoType: resultGoType,
			}, context);

		return DEither.isLeft(narrowed)
			? context.error(node, "type-assertion-not-supported")
			: context.success({
				before: inner.before,
				result: DEither.unwrapRight(narrowed).result,
			});
	},
);

/**
 * `"name" in value` : présence d'une propriété, connue d'après le type Go.
 * Union de structs : vrai pour les membres qui déclarent le champ (rétrécissement
 * habituel des unions non discriminées) ; champ optionnel : non undefined.
 */
export const inOperatorTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (
			!TsAST.isBinaryExpression(node)
			|| node.operatorToken.kind !== TsAST.SyntaxKind.InKeyword
			|| !TsAST.isStringLiteral(node.left)
		) {
			return context.notSupport();
		}

		const name = node.left.text;
		const objectGoType = await goTypeOrUndefined(node.right, context);

		if (!objectGoType) {
			return context.error(node, "in-operator-type-not-supported");
		}

		const object = DEither.unwrapRight(await transformToTemporary(node.right, context));

		if (DEither.isLeft(object)) {
			return object;
		}

		const presence = (expression: GoAST.Expression, goType: GoType): GoAST.Expression | undefined => {
			const fields = DEither.unwrapRight(getStructFields(goType));

			if (DEither.isLeft(fields)) {
				return undefined;
			}

			const field = fields.find((known) => known.name === name);

			if (!field) {
				return GoAST.createBooleanLiteral({ value: false });
			}

			if (!field.optional) {
				return GoAST.createBooleanLiteral({ value: true });
			}

			const fieldMembers = DEither.unwrapRight(getUnionMemberGoTypes(field.goType));
			const undefinedIndex = DEither.isLeft(fieldMembers)
				? -1
				: findUnionMemberIndex(fieldMembers, createUndefinedGoType(context));

			return GoAST.createBinaryExpression({
				operator: "!=",
				left: go.select(go.select(expression, field.identifier), unionTagField),
				right: go.integer(undefinedIndex),
			});
		};

		const members = DEither.unwrapRight(getUnionMemberGoTypes(objectGoType));
		const direct = DEither.isLeft(members) ? presence(object.identifier, objectGoType) : undefined;

		if (DEither.isLeft(members)) {
			return direct
				? context.success({
					before: object.before,
					result: direct,
				})
				: context.error(node, "in-operator-type-not-supported");
		}

		const conditions: GoAST.Expression[] = [];

		for (const [index, member] of members.entries()) {
			const memberPresence = presence(go.select(object.identifier, unionValueField(index)), member);

			if (!memberPresence) {
				return context.error(node, "in-operator-type-not-supported");
			}

			if (DModeling.hasTagValue(memberPresence, "[node][expression]literal-boolean")) {
				if (memberPresence.value) {
					conditions.push(go.equal(go.select(object.identifier, unionTagField), go.integer(index)));
				}
				continue;
			}

			conditions.push(GoAST.createBinaryExpression({
				operator: "&&",
				left: go.equal(go.select(object.identifier, unionTagField), go.integer(index)),
				right: memberPresence,
			}));
		}

		return context.success({
			before: object.before,
			result: conditions.length === 0
				? GoAST.createBooleanLiteral({ value: false })
				: conditions.reduce((left, right) => GoAST.createBinaryExpression({
					operator: "||",
					left,
					right,
				})),
		});
	},
);

/**
 * `(e)` : la valeur de `e`. Un résultat composé (opération binaire ou unaire)
 * est rangé dans une variable, pour que la priorité des opérateurs Go ne puisse
 * pas changer le sens de l'expression englobante.
 */
export const parenthesizedExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isParenthesizedExpression(node)) {
			return context.notSupport();
		}

		const inner = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(inner)) {
			return inner;
		}

		if (
			!DModeling.hasTagValue(inner.result, "[node][expression]binary")
			&& !DModeling.hasTagValue(inner.result, "[node][expression]unary")
		) {
			return context.success(inner);
		}

		const temporary = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: inner.result,
		});

		return context.success({
			before: DArray.concat(inner.before, [temporary]),
			result: temporary.identifier,
		});
	},
);
