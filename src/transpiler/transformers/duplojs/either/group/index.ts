import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { IndexKind, SignatureKind } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { evaluateToVariable } from "../../../expression/evaluate";
import { transformCheckerType } from "../../../type";
import { eitherSuccessDependency, successFunctionIdentifier, successTypeIdentifier } from "../success/sharedDependency";
import {
	createMembersTest,
	filterSide,
	getEitherValue,
	getMemberValue,
	placeValue,
	resolveEitherInput,
	unwrapPromiseType,
} from "../members";

// `group([...])` et `asyncGroup([...])` : la transaction réussit seulement si chaque résultat est un `Right`.
// Le premier échec rencontré devient le résultat ; sinon les valeurs sont réunies, dans l'ordre, dans un `Success`.
// Si les éléments sont des fonctions (getters), elles sont appelées à chaque itération.
// La boucle est placée dans une fonction Go appelée immédiatement : l'échec est un `return` anticipé.
export async function groupExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "group-reference-without-call-not-supported");
	}

	const [groupNode] = node.arguments;

	if (!groupNode || !DArray.lengthEqual(node.arguments, 1)) {
		return context.error(node, "group-expects-one-argument");
	}

	const { typeChecker } = context.transpilation;
	const groupType = await typeChecker.getTypeAtLocation(groupNode);

	const groupGoType = await transformCheckerType(groupType, groupNode, context);

	if (DEither.isLeft(groupGoType)) {
		return groupGoType;
	}

	const groupRepresentation = DEither.unwrapRight(groupGoType);

	// Un tableau ou une slice est accepté.
	if (
		!DModeling.hasTagValue(groupRepresentation, "[node][type]slice")
		&& !DModeling.hasTagValue(groupRepresentation, "[node][type]array")
	) {
		return context.error(groupNode, "group-only-supports-arrays");
	}

	const elementType = await typeChecker.getIndexTypeOfType(groupType, IndexKind.Number);

	if (!elementType) {
		return context.error(groupNode, "group-element-type-not-resolved");
	}

	// Si l'élément est une fonction (cas de `asyncGroup` ou de getters), on extrait son type de retour.
	const signatures = await typeChecker.getSignaturesOfType(elementType, SignatureKind.Call);
	const isGetter = signatures.length > 0;
	let effectiveEitherType = elementType;

	if (isGetter && signatures[0]) {
		const rawReturnType = await typeChecker.getReturnTypeOfSignature(signatures[0]);
		effectiveEitherType = await unwrapPromiseType(rawReturnType, context);
	}

	const elementInput = await resolveEitherInput(effectiveEitherType, groupNode, context);

	if (DEither.isLeft(elementInput)) {
		return elementInput;
	}

	const either = DEither.unwrapRight(elementInput);
	const leftMembers = filterSide(either, "left");
	const rightMembers = filterSide(either, "right");
	const [rightMember] = rightMembers;

	if (!rightMember || !DArray.lengthEqual(rightMembers, 1) || !DArray.lengthEqual(filterSide(either, "other"), 0)) {
		return context.error(groupNode, "group-element-must-have-one-right-representation");
	}

	if (!DModeling.hasTagValue(rightMember.goType, "[node]type-reference-generic")) {
		return context.error(groupNode, "group-right-value-not-resolved");
	}

	const [valueGoType] = rightMember.goType.typeArguments;

	if (!valueGoType) {
		return context.error(groupNode, "group-right-value-not-resolved");
	}

	const group = await evaluateToVariable(groupNode, context);

	if (DEither.isLeft(group)) {
		return group;
	}

	const outputType = await typeChecker.getTypeAtLocation(node);
	const outputGoType = await transformCheckerType(outputType, node, context);

	if (DEither.isLeft(outputGoType)) {
		return outputGoType;
	}

	const element = context.generateIdentifier("groupItem");
	const current = isGetter ? context.generateIdentifier("currentResult") : element;
	const values = context.generateIdentifier("successValues");

	const outputEffectiveType = await unwrapPromiseType(outputType, context);
	const outputEither = await resolveEitherInput(outputEffectiveType, node, context);

	let valuesType: GoAST.Type = GoAST.createSliceType({ elementType: valueGoType });
	if (DEither.isRight(outputEither)) {
		const outRightMembers = filterSide(DEither.unwrapRight(outputEither), "right");
		const [firstOutRight] = outRightMembers;
		if (firstOutRight && DModeling.hasTagValue(firstOutRight.goType, "[node]type-reference-generic")) {
			const [firstArg] = firstOutRight.goType.typeArguments;
			if (firstArg) {
				valuesType = firstArg as GoAST.Type;
			}
		}
	}
	const isTargetArray = DModeling.hasTagValue(valuesType, "[node][type]array");
	const indexIdentifier = isTargetArray ? context.generateIdentifier("index") : undefined;

	// Un `return` anticipé par variante d'échec : l'échec devient le résultat de la transaction.
	const leftReturns = await DCommon.asyncPipe(
		leftMembers,
		DArray.map(
			async(member) => DEither.rightPipe(
				await placeValue({
					expression: getMemberValue(current, either, member),
					goType: member.goType,
					target: outputType,
					location: node,
					context,
				}),
				(returned): DEither.Success<GoAST.Statement> => DEither.success(
					GoAST.createIfStatement({
						condition: createMembersTest(current, either, [member]),
						body: GoAST.createBlockStatement({
							statements: [GoAST.createReturnStatement({ values: [returned] })],
						}),
					}),
				),
			),
		),
		DCommon.promiseAll,
		DArray.reduce(
			DArray.reduceFrom<readonly GoAST.Statement[]>([]),
			({ element: statement, lastValue, next, exit }) => DEither.isLeft(statement)
				? exit(statement)
				: next(DArray.push(lastValue, DEither.unwrapRight(statement))),
		),
	);

	if (DEither.isLeft(leftReturns)) {
		return leftReturns;
	}

	const successGoType = GoAST.createGenericTypeReference({
		typeReference: GoAST.createPackageTypeReference({
			packageName: context.registerSharedDependency(eitherSuccessDependency.value),
			identifier: successTypeIdentifier,
		}),
		typeArguments: DCommon.cast([valuesType]),
	});

	const success = await placeValue({
		expression: GoAST.createCallExpression({
			callee: GoAST.createInstantiationExpression({
				target: GoAST.createSelectorExpression({
					target: context.registerSharedDependency(eitherSuccessDependency.value),
					identifier: successFunctionIdentifier,
				}),
				typeArguments: DCommon.cast([valuesType]),
			}),
			arguments: [values],
		}),
		goType: successGoType,
		target: outputType,
		location: node,
		context,
	});

	if (DEither.isLeft(success)) {
		return success;
	}

	return context.success({
		before: DEither.unwrapRight(group).before,
		result: GoAST.createCallExpression({
			callee: GoAST.createFunctionLiteral({
				arguments: [],
				returnTypes: [DEither.unwrapRight(outputGoType)],
				body: GoAST.createBlockStatement({
					statements: [
						isTargetArray
							? GoAST.createVariableDeclarationZeroValue({
								identifier: values,
								typeReference: valuesType,
							})
							: GoAST.createShortVariableDeclarationStatement({
								identifier: values,
								initializer: GoAST.createCallExpression({
									callee: GoAST.createIdentifier("make"),
									typeArgument: valuesType,
									arguments: [
										GoAST.createIntegerLiteral({ value: 0n }),
										GoAST.createCallExpression({
											callee: GoAST.createIdentifier("len"),
											arguments: [DEither.unwrapRight(group).identifier],
										}),
									],
								}),
							}),
						GoAST.createRangeStatement({
							binding: isTargetArray && indexIdentifier
								? GoAST.createRangeDeclaration({
									key: indexIdentifier,
									value: element,
								})
								: GoAST.createRangeDeclaration({
									key: GoAST.createIdentifier("_"),
									value: element,
								}),
							expression: DEither.unwrapRight(group).identifier,
							body: GoAST.createBlockStatement({
								statements: [
									...(isGetter
										? [
											GoAST.createShortVariableDeclarationStatement({
												identifier: current,
												initializer: GoAST.createCallExpression({
													callee: element,
													arguments: [],
												}),
											}),
										]
										: []),
									...leftReturns,
									isTargetArray && indexIdentifier
										? GoAST.createAssignmentStatement({
											targets: DCommon.cast([
												GoAST.createIndexExpression({
													target: values,
													index: indexIdentifier,
												}),
											]),
											values: DCommon.cast([
												getEitherValue(getMemberValue(current, either, rightMember)),
											]),
										})
										: GoAST.createAssignmentStatement({
											targets: DCommon.cast([values]),
											values: DCommon.cast([
												GoAST.createCallExpression({
													callee: GoAST.createIdentifier("append"),
													arguments: [
														values,
														getEitherValue(getMemberValue(current, either, rightMember)),
													],
												}),
											]),
										}),
								],
							}),
						}),
						GoAST.createReturnStatement({ values: [DEither.unwrapRight(success)] }),
					],
				}),
			}),
			arguments: [],
		}),
	});
}
