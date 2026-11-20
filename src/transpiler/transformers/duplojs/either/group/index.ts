import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind } from "typescript/async";
import type { BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import {
	eitherDependency,
	eitherTypeIdentifier,
	getValueMethodIdentifier,
	isRightMethodIdentifier,
} from "../sharedDependency";
import { eitherSuccessDependency, successFunctionIdentifier } from "../success/sharedDependency";
import { tupleSharedDependency } from "../../../type/tupleSharedDependency";
import { getEitherRightValueType, invokeCallable } from "../../callable";

export async function groupExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
	_isAsync = false,
) {
	if (!TsAST.isCallExpression(node) || node.arguments.length < 1) {
		return context.notSupport();
	}

	const { typeChecker } = context.transpilation;
	const [arrayArg] = node.arguments;
	if (!arrayArg) {
		return context.error(node, "group-missing-argument");
	}

	const eitherPkg = context.registerSharedDependency(eitherDependency.value);
	const successPkg = context.registerSharedDependency(eitherSuccessDependency.value);

	const eitherTypeRef = GoAST.createPackageTypeReference({
		packageName: eitherPkg,
		identifier: eitherTypeIdentifier,
	});

	// Déterminer le type de la valeur Right attendue
	const nodeType = await typeChecker.getTypeAtLocation(node);
	const rightType = await getEitherRightValueType(nodeType, node, context);

	let elemType: GoAST.Type | GoAST.TypeReference | undefined = undefined;
	if (rightType) {
		if (DModeling.hasTagValue(rightType, "[node][type]slice")) {
			elemType = (rightType as GoAST.SliceType).elementType;
		} else if (DModeling.hasTagValue(rightType, "[node][type]array")) {
			elemType = (rightType as GoAST.ArrayType).elementType;
		} else if (DModeling.hasTagValue(rightType, "[node]type-reference-generic")) {
			const genRef = rightType as GoAST.GenericTypeReference;
			elemType = genRef.typeArguments[0] as GoAST.Type;
		} else {
			elemType = rightType;
		}
	} else {
		const argType = await typeChecker.getTypeAtLocation(arrayArg);
		const argTypeNode = await typeChecker.typeToTypeNode(argType, arrayArg);
		if (argTypeNode && TsAST.isArrayTypeNode(argTypeNode)) {
			const innerEitherType = await typeChecker.getTypeAtLocation(argTypeNode.elementType);
			const innerRightType = await getEitherRightValueType(innerEitherType, arrayArg, context);
			if (innerRightType) {
				elemType = innerRightType;
			}
		}
	}

	if (!elemType) {
		return context.error(node, "group-cannot-determine-element-type");
	}

	// Cas A : arrayArg est un ArrayLiteralExpression
	if (TsAST.isArrayLiteralExpression(arrayArg)) {
		const count = arrayArg.elements.length;
		const isTuple = count >= 2 && count <= 8;
		const valsVar = context.generateIdentifier();
		const resVar = context.generateIdentifier();
		const okVar = context.generateIdentifier();

		// Résolution des types par élément pour le tuple
		const stepElemTypes: (GoAST.Type | GoAST.TypeReference)[] = [];
		const valVars: GoAST.Identifier[] = [];
		for (let i = 0; i < count; i++) {
			const elemNode = arrayArg.elements[i];
			valVars.push(context.generateIdentifier());
			let stepType: GoAST.Type | GoAST.TypeReference = elemType;
			if (elemNode) {
				const elemTypeAtLoc = await typeChecker.getTypeAtLocation(elemNode);
				const sigs = await typeChecker.getSignaturesOfType(elemTypeAtLoc, SignatureKind.Call);
				if (sigs.length > 0 && sigs[0]) {
					const retType = await typeChecker.getReturnTypeOfSignature(sigs[0]);
					const rType = await getEitherRightValueType(retType, elemNode, context);
					if (rType) {
						stepType = rType;
					}
				} else {
					const rType = await getEitherRightValueType(elemTypeAtLoc, elemNode, context);
					if (rType) {
						stepType = rType;
					}
				}
			}
			stepElemTypes.push(stepType);
		}

		const beforeStatements: GoAST.Statement[] = [
			GoAST.createVariableDeclarationZeroValue({
				identifier: resVar,
				typeReference: eitherTypeRef,
			}),
			GoAST.createShortVariableDeclarationStatement({
				identifier: okVar,
				initializer: GoAST.createBooleanLiteral({ value: true }),
			}),
		];

		if (isTuple) {
			for (let idx = 0; idx < count; idx++) {
				const valId = valVars[idx];
				const stType = stepElemTypes[idx];
				if (valId && stType) {
					beforeStatements.push(
						GoAST.createVariableDeclarationZeroValue({
							identifier: valId,
							typeReference: stType,
						}),
					);
				}
			}
		} else {
			beforeStatements.unshift(
				GoAST.createShortVariableDeclarationStatement({
					identifier: valsVar,
					initializer: GoAST.createCallExpression({
						callee: GoAST.createIdentifier("make"),
						typeArgument: GoAST.createSliceType({ elementType: elemType }),
						arguments: [GoAST.createIntegerLiteral({ value: BigInt(count) })],
					}),
				}),
			);
		}

		let currentTarget = beforeStatements;

		for (let itemIndex = 0; itemIndex < count; itemIndex++) {
			const elem = arrayArg.elements[itemIndex];
			if (!elem) {
				return context.error(arrayArg, "group-array-literal-missing-element");
			}
			let stepExpr: GoAST.Expression = GoAST.createIdentifier("");
			const stepBefore: GoAST.Statement[] = [];

			const elemTypeAtLoc = await typeChecker.getTypeAtLocation(elem);
			const sigs = await typeChecker.getSignaturesOfType(elemTypeAtLoc, SignatureKind.Call);

			if (sigs.length > 0) {
				const invoked = await DCommon.asyncPipe(
					invokeCallable(elem, undefined, context),
					DEither.unwrapRight,
				);
				if (DEither.isLeft(invoked)) {
					return context.error(elem, "group-step-callable-error");
				}
				stepBefore.push(...invoked.before);
				stepExpr = invoked.result;
			} else {
				const transformed = await DCommon.asyncPipe(
					context.transform(elem, expressionTransformers.value),
					DEither.unwrapRight,
				);
				if (DEither.isLeft(transformed)) {
					return transformed;
				}
				stepBefore.push(...(transformed.before ?? []));
				stepExpr = transformed.result;
			}

			const stepItemVar = context.generateIdentifier();
			currentTarget.push(
				...stepBefore,
				GoAST.createShortVariableDeclarationStatement({
					identifier: stepItemVar,
					initializer: stepExpr,
				}),
			);

			const currentStepType = stepElemTypes[itemIndex] ?? elemType;
			const targetAssign = isTuple && valVars[itemIndex]
				? valVars[itemIndex]!
				: GoAST.createIndexExpression({
					target: valsVar,
					index: GoAST.createIntegerLiteral({ value: BigInt(itemIndex) }),
				});

			const elseStatements: GoAST.Statement[] = [
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([targetAssign]),
					values: DCommon.cast([
						GoAST.createTypeAssertionExpression({
							target: GoAST.createCallExpression({
								callee: GoAST.createSelectorExpression({
									target: stepItemVar,
									identifier: getValueMethodIdentifier,
								}),
								arguments: [],
							}),
							typeReference: currentStepType,
						}),
					]),
				}),
			];

			const ifFailStmt = GoAST.createIfStatement({
				condition: GoAST.createUnaryExpression({
					operator: "!",
					operand: GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target: stepItemVar,
							identifier: isRightMethodIdentifier,
						}),
						arguments: [],
					}),
				}),
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([resVar]),
							values: DCommon.cast([stepItemVar]),
						}),
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([okVar]),
							values: DCommon.cast([GoAST.createBooleanLiteral({ value: false })]),
						}),
					],
				}),
				elseBranch: GoAST.createBlockStatement({
					statements: elseStatements,
				}),
			});

			currentTarget.push(ifFailStmt);
			currentTarget = elseStatements;
		}

		let successValExpr: GoAST.Expression = valsVar;
		if (isTuple) {
			const tuplePkg = context.registerSharedDependency(tupleSharedDependency.value);
			successValExpr = GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: tuplePkg,
					identifier: GoAST.createIdentifier(`Tuple${count}Of`),
				}),
				arguments: valVars,
			});
		}

		beforeStatements.push(
			GoAST.createIfStatement({
				condition: okVar,
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([resVar]),
							values: DCommon.cast([
								GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: successPkg,
										identifier: successFunctionIdentifier,
									}),
									arguments: [successValExpr],
								}),
							]),
						}),
					],
				}),
			}),
		);

		return context.success({
			before: beforeStatements,
			result: resVar,
		});
	}

	// Cas B : arrayArg est une expression dynamique (ex: calculations)
	const transformedArray = await DCommon.asyncPipe(
		context.transform(arrayArg, expressionTransformers.value),
		DEither.unwrapRight,
	);
	if (DEither.isLeft(transformedArray)) {
		return transformedArray;
	}

	const arrVar = context.generateIdentifier();
	const valsVar = context.generateIdentifier();
	const resVar = context.generateIdentifier();
	const okVar = context.generateIdentifier();
	const iVar = context.generateIdentifier();
	const itemVar = context.generateIdentifier();

	const loopStatements: GoAST.Statement[] = [
		GoAST.createIfStatement({
			condition: GoAST.createUnaryExpression({
				operator: "!",
				operand: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: itemVar,
						identifier: isRightMethodIdentifier,
					}),
					arguments: [],
				}),
			}),
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createAssignmentStatement({
						targets: DCommon.cast([resVar]),
						values: DCommon.cast([itemVar]),
					}),
					GoAST.createAssignmentStatement({
						targets: DCommon.cast([okVar]),
						values: DCommon.cast([GoAST.createBooleanLiteral({ value: false })]),
					}),
					GoAST.createBreakStatement({}),
				],
			}),
		}),
		GoAST.createAssignmentStatement({
			targets: DCommon.cast([
				GoAST.createIndexExpression({
					target: valsVar,
					index: iVar,
				}),
			]),
			values: DCommon.cast([
				GoAST.createTypeAssertionExpression({
					target: GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target: itemVar,
							identifier: getValueMethodIdentifier,
						}),
						arguments: [],
					}),
					typeReference: elemType,
				}),
			]),
		}),
	];

	const beforeStatements: GoAST.Statement[] = [
		...(transformedArray.before ?? []),
		GoAST.createShortVariableDeclarationStatement({
			identifier: arrVar,
			initializer: transformedArray.result,
		}),
		GoAST.createShortVariableDeclarationStatement({
			identifier: valsVar,
			initializer: GoAST.createCallExpression({
				callee: GoAST.createIdentifier("make"),
				typeArgument: GoAST.createSliceType({ elementType: elemType }),
				arguments: [
					GoAST.createCallExpression({
						callee: GoAST.createIdentifier("len"),
						arguments: [arrVar],
					}),
				],
			}),
		}),
		GoAST.createVariableDeclarationZeroValue({
			identifier: resVar,
			typeReference: eitherTypeRef,
		}),
		GoAST.createShortVariableDeclarationStatement({
			identifier: okVar,
			initializer: GoAST.createBooleanLiteral({ value: true }),
		}),
		GoAST.createRangeStatement({
			binding: GoAST.createRangeDeclaration({
				key: iVar,
				value: itemVar,
			}),
			expression: arrVar,
			body: GoAST.createBlockStatement({
				statements: loopStatements,
			}),
		}),
		GoAST.createIfStatement({
			condition: okVar,
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createAssignmentStatement({
						targets: DCommon.cast([resVar]),
						values: DCommon.cast([
							GoAST.createCallExpression({
								callee: GoAST.createSelectorExpression({
									target: successPkg,
									identifier: successFunctionIdentifier,
								}),
								arguments: [valsVar],
							}),
						]),
					}),
				],
			}),
		}),
	];

	return context.success({
		before: beforeStatements,
		result: resVar,
	});
}
