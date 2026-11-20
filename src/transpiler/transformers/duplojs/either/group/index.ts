import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import { type Transformer } from "@transformer";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { goTypeOf, goTypeOfExpression } from "../../../type/goTypeOf";
import {
	either2FromLeftFunctionIdentifier,
	either2SuccessFunctionIdentifier,
	eitherDependency,
	eitherSuccessFunctionIdentifier,
} from "../sharedDependency";
import { createEither2GoType, getEither2GoTypes, getEitherValueAccess, getEitherValueGoType } from "../goType";
import { coerceGoExpression, eitherVariantNames } from "../coerce";

const makeIdentifier = GoAST.createIdentifier("make");
const lenIdentifier = GoAST.createIdentifier("len");
const appendIdentifier = GoAST.createIdentifier("append");
const isLeftIdentifier = GoAST.createIdentifier("IsLeft");

function selectResultTypes(params: {
	either2Types: ReturnType<typeof DEither.unwrapRight<ReturnType<typeof getEither2GoTypes>>>;
	eitherValueType: ReturnType<typeof DEither.unwrapRight<ReturnType<typeof getEitherValueGoType>>>;
	leftIsPossible: boolean;
}) {
	const { either2Types, eitherValueType, leftIsPossible } = params;

	if (!DEither.isLeft(either2Types)) {
		return either2Types;
	}

	if (DEither.isLeft(eitherValueType) || leftIsPossible) {
		return undefined;
	}

	return {
		leftType: undefined,
		rightType: eitherValueType,
	};
}

export async function groupExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
	allowFactories = false,
) {
	if (!TsAST.isCallExpression(node) || node.arguments.length !== 1) {
		return context.error(node, "duplojs-either-group-requires-exactly-one-array");
	}

	const [arrayNode] = node.arguments;

	if (!arrayNode || TsAST.isSpreadElement(arrayNode)) {
		return context.error(node, "duplojs-either-group-spread-is-not-supported");
	}

	const array = DEither.unwrapRight(
		await context.transform(arrayNode, expressionTransformers.value),
	);

	if (DEither.isLeft(array)) {
		return array;
	}

	const arrayGoType = DEither.unwrapRight(await goTypeOfExpression(arrayNode, context));

	if (DEither.isLeft(arrayGoType)) {
		return arrayGoType;
	}

	if (!DModeling.hasTagValue(arrayGoType.result, "[node][type]slice")) {
		return context.error(
			arrayNode,
			allowFactories
				? "duplojs-either-async-group-only-supports-arrays"
				: "duplojs-either-group-input-is-not-a-slice",
		);
	}

	const resultGoType = DEither.unwrapRight(
		await goTypeOf(await context.transpilation.typeChecker.getTypeAtLocation(node), node, context),
	);

	if (DEither.isLeft(resultGoType)) {
		return resultGoType;
	}

	// Deux formes de résultat (ADR-12, D22) :
	// - Either2[L, []R] : le type de l'appel contient des gauches (premier gauche renvoyé) ;
	// - Either[[]R] : aucun gauche possible d'après le type TS de l'appel (toutes les
	//   fabriques réussissent, ex. `Success<[1, 2]>`) ; la boucle n'a pas de test IsLeft.
	const either2Types = DEither.unwrapRight(getEither2GoTypes(resultGoType.result));
	const eitherValueType = DEither.unwrapRight(getEitherValueGoType(resultGoType.result));
	const resultVariants = await eitherVariantNames(
		await context.transpilation.typeChecker.getTypeAtLocation(node),
		context,
	);
	const leftIsPossible = DArray.some(resultVariants, (name) => name === "Left" || name === "Fail");

	const resultTypes = selectResultTypes({
		either2Types,
		eitherValueType,
		leftIsPossible,
	});

	if (!resultTypes) {
		return context.error(node, "duplojs-either-group-unsupported-result-type");
	}

	let elementType = arrayGoType.result.elementType;
	let isFactory = false;

	if (allowFactories && DModeling.hasTagValue(elementType, "[node][type]function")) {
		if (elementType.arguments.length !== 0 || !DArray.lengthEqual(elementType.returnTypes, 1)) {
			return context.error(arrayNode, "duplojs-either-async-group-factory-must-take-no-arguments");
		}

		const returnType = DArray.first(elementType.returnTypes);

		if (!returnType) {
			return context.error(arrayNode, "duplojs-either-async-group-factory-must-return-one-value");
		}

		elementType = returnType;
		isFactory = true;
	}

	const valueAccess = DEither.unwrapRight(getEitherValueAccess(elementType));

	if (DEither.isLeft(valueAccess)) {
		return context.error(arrayNode, "duplojs-either-group-elements-are-not-eithers");
	}

	if (!DModeling.hasTagValue(resultTypes.rightType, "[node][type]slice")) {
		return context.error(node, "duplojs-either-group-right-type-is-not-a-slice");
	}

	// ADR-13 : élément Either2[EL, ER] (ou Either[V]) dont les côtés diffèrent du
	// résultat Either2[L, []R] : chaque côté est converti (membre vers union…).
	const elementEither2 = DEither.unwrapRight(getEither2GoTypes(elementType));
	const elementLeft = DEither.isLeft(elementEither2)
		? {
			field: GoAST.createIdentifier("Value"),
			goType: valueAccess.valueType,
		}
		: {
			field: GoAST.createIdentifier("Left"),
			goType: elementEither2.leftType,
		};
	const leftMatches = !resultTypes.leftType
		|| (
			DEither.isLeft(elementEither2)
			&& GoPrinter.renderNode(valueAccess.valueType) === GoPrinter.renderNode(resultTypes.leftType)
		);

	const packageName = context.registerSharedDependency(eitherDependency.value);
	const arrayIdentifier = context.generateIdentifier();
	const outputIdentifier = context.generateIdentifier();
	const resultIdentifier = context.generateIdentifier();
	const elementIdentifier = context.generateIdentifier();
	const valueIdentifier = isFactory ? context.generateIdentifier() : elementIdentifier;
	const hasLeftIdentifier = context.generateIdentifier();
	const outputType = GoAST.createSliceType({
		elementType: resultTypes.rightType.elementType,
	});

	const { leftType } = resultTypes;
	const convertedLeft = leftType && !leftMatches
		? await coerceGoExpression({
			expression: GoAST.createSelectorExpression({
				target: valueIdentifier,
				identifier: elementLeft.field,
			}),
			fromGoType: elementLeft.goType,
			toGoType: leftType,
		}, context)
		: undefined;

	if (convertedLeft && DEither.isLeft(convertedLeft)) {
		return context.error(node, "duplojs-either-group-left-type-mismatch");
	}

	const convertedRight = await coerceGoExpression({
		expression: GoAST.createSelectorExpression({
			target: valueIdentifier,
			identifier: valueAccess.field,
		}),
		fromGoType: valueAccess.valueType,
		toGoType: resultTypes.rightType.elementType,
	}, context);

	if (DEither.isLeft(convertedRight)) {
		return context.error(node, "duplojs-either-group-right-type-mismatch");
	}

	const leftConstructor = convertedLeft && leftType
		? GoAST.createStructLiteral({
			typeReference: DCommon.cast(createEither2GoType(packageName, leftType, resultTypes.rightType)),
			elements: [
				GoAST.createKeyedElement({
					key: GoAST.createIdentifier("Kind"),
					value: GoAST.createSelectorExpression({
						target: valueIdentifier,
						identifier: GoAST.createIdentifier("Kind"),
					}),
				}),
				GoAST.createKeyedElement({
					key: GoAST.createIdentifier("Information"),
					value: GoAST.createSelectorExpression({
						target: valueIdentifier,
						identifier: GoAST.createIdentifier("Information"),
					}),
				}),
				GoAST.createKeyedElement({
					key: GoAST.createIdentifier("Left"),
					value: DEither.unwrapRight(convertedLeft).result,
				}),
			],
		})
		: leftType && GoAST.createCallExpression({
			callee: GoAST.createInstantiationExpression({
				target: GoAST.createSelectorExpression({
					target: packageName,
					identifier: either2FromLeftFunctionIdentifier,
				}),
				typeArguments: DCommon.cast([leftType, resultTypes.rightType]),
			}),
			arguments: [valueIdentifier],
		});
	const successConstructor = GoAST.createCallExpression({
		callee: GoAST.createInstantiationExpression({
			target: GoAST.createSelectorExpression({
				target: packageName,
				identifier: leftType ? either2SuccessFunctionIdentifier : eitherSuccessFunctionIdentifier,
			}),
			typeArguments: leftType
				? DCommon.cast([leftType, resultTypes.rightType])
				: DCommon.cast([resultTypes.rightType]),
		}),
		arguments: [outputIdentifier],
	});
	const elementValue = isFactory
		? GoAST.createShortVariableDeclarationStatement({
			identifier: valueIdentifier,
			initializer: GoAST.createCallExpression({
				callee: elementIdentifier,
				arguments: [],
			}),
		})
		: undefined;

	// Test « premier gauche » : seulement si un gauche est possible (forme Either2).
	const leftCheck: readonly GoAST.Statement[] = leftConstructor
		? [
			GoAST.createIfStatement({
				condition: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: valueIdentifier,
						identifier: isLeftIdentifier,
					}),
					arguments: [],
				}),
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([resultIdentifier]),
							values: DCommon.cast([leftConstructor]),
						}),
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([hasLeftIdentifier]),
							values: DCommon.cast([GoAST.createBooleanLiteral({ value: true })]),
						}),
						GoAST.createBreakStatement({}),
					],
				}),
			}),
		]
		: [];

	return context.success({
		before: [
			...array.before,
			GoAST.createShortVariableDeclarationStatement({
				identifier: arrayIdentifier,
				initializer: array.result,
			}),
			GoAST.createShortVariableDeclarationStatement({
				identifier: outputIdentifier,
				initializer: GoAST.createCallExpression({
					callee: makeIdentifier,
					arguments: DCommon.cast([
						outputType as unknown as GoAST.Expression,
						GoAST.createIntegerLiteral({ value: 0n }),
						GoAST.createCallExpression({
							callee: lenIdentifier,
							arguments: [arrayIdentifier],
						}),
					]),
				}),
			}),
			...(leftConstructor
				? [
					GoAST.createShortVariableDeclarationStatement({
						identifier: hasLeftIdentifier,
						initializer: GoAST.createBooleanLiteral({ value: false }),
					}),
				]
				: []),
			GoAST.createVariableDeclarationZeroValue({
				identifier: resultIdentifier,
				typeReference: resultGoType.result,
			}),
			GoAST.createRangeStatement({
				binding: GoAST.createRangeDeclaration({
					key: GoAST.createIdentifier("_"),
					value: elementIdentifier,
				}),
				expression: arrayIdentifier,
				body: GoAST.createBlockStatement({
					statements: [
						...(elementValue ? [elementValue] : []),
						...leftCheck,
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([outputIdentifier]),
							values: DCommon.cast([
								GoAST.createCallExpression({
									callee: appendIdentifier,
									arguments: DCommon.cast([
										outputIdentifier,
										DEither.unwrapRight(convertedRight).result,
									]),
								}),
							]),
						}),
					],
				}),
			}),
			leftConstructor
				? GoAST.createIfStatement({
					condition: GoAST.createUnaryExpression({
						operator: "!",
						operand: hasLeftIdentifier,
					}),
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createAssignmentStatement({
								targets: DCommon.cast([resultIdentifier]),
								values: DCommon.cast([successConstructor]),
							}),
						],
					}),
				})
				: GoAST.createAssignmentStatement({
					targets: DCommon.cast([resultIdentifier]),
					values: DCommon.cast([successConstructor]),
				}),
		],
		result: resultIdentifier,
	});
}

export function asyncGroupExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	return groupExpressionHandler(node, context, true);
}
