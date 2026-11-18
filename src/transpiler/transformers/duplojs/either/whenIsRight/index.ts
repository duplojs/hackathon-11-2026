import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { consumeVariable, evaluateAllToVariables } from "../../../expression/evaluate";
import { transformCheckerType } from "../../../type";
import {
	createMembersTest,
	filterSide,
	getCallbackTypes,
	getEitherValue,
	getFunctionTypes,
	getMemberValue,
	isConstantTest,
	placeValue,
	resolveEitherInput,
} from "../members";

// `whenIsRight(input, theFunction)` : la fonction n'est appliquée qu'à la valeur d'un `Right` ;
// toute autre variante est renvoyée inchangée. Les variantes sont classées à la compilation et
// le choix à l'exécution est un `if` sur l'étiquette de l'union.
// La forme à un argument renvoie une fonction : elle devient une fonction littérale Go.
export async function whenIsRightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "when-is-right-reference-without-call-not-supported");
	}

	const isCurried = DArray.lengthEqual(node.arguments, 1);

	if (!isCurried && !DArray.lengthEqual(node.arguments, 2)) {
		return context.error(node, "when-is-right-expects-one-or-two-arguments");
	}

	const { typeChecker } = context.transpilation;
	const [firstNode, secondNode] = node.arguments;
	const theFunctionNode = isCurried ? firstNode : secondNode;

	if (!firstNode || !theFunctionNode) {
		return context.error(node, "when-is-right-expects-one-or-two-arguments");
	}

	const evaluated = await evaluateAllToVariables(node.arguments, context);

	if (DEither.isLeft(evaluated)) {
		return evaluated;
	}

	const { before, identifiers } = DEither.unwrapRight(evaluated);
	const theFunction = identifiers[isCurried ? 0 : 1];

	if (!theFunction) {
		return context.error(node, "when-is-right-expects-one-or-two-arguments");
	}

	const callType = await typeChecker.getTypeAtLocation(node);

	// Forme curryfiée : l'entrée et la sortie sont celles de la fonction renvoyée.
	const curriedTypes = isCurried
		? await getFunctionTypes(callType, node, context)
		: undefined;

	if (curriedTypes && DEither.isLeft(curriedTypes)) {
		return curriedTypes;
	}

	const curried = curriedTypes && DEither.unwrapRight(curriedTypes);
	const inputType = curried
		? curried.parameters[0]
		: await typeChecker.getTypeAtLocation(firstNode);
	const outputType = curried
		? curried.returnType
		: callType;
	const input = curried
		? context.generateIdentifier()
		: identifiers[0];

	if (!inputType || !input) {
		return context.error(node, "when-is-right-input-not-resolved");
	}

	const eitherInput = await resolveEitherInput(inputType, node, context);

	if (DEither.isLeft(eitherInput)) {
		return eitherInput;
	}

	const either = DEither.unwrapRight(eitherInput);
	const rightMembers = filterSide(either, "right");
	const otherMembers = DArray.filter(either.members, (member) => member.side !== "right");
	const [rightMember] = rightMembers;

	if (rightMembers.length > 1) {
		return context.error(node, "when-is-right-several-right-representations-not-supported");
	}

	const theFunctionTypes = await getCallbackTypes(theFunctionNode, context);

	if (DEither.isLeft(theFunctionTypes)) {
		return theFunctionTypes;
	}

	const { parameters, returnType } = DEither.unwrapRight(theFunctionTypes);
	const returnGoType = await transformCheckerType(returnType, theFunctionNode, context);

	if (DEither.isLeft(returnGoType)) {
		return returnGoType;
	}

	const rightValue = rightMember
		? await placeValue({
			expression: GoAST.createCallExpression({
				callee: theFunction,
				arguments: DArray.lengthEqual(parameters, 0)
					? []
					: [getEitherValue(getMemberValue(input, either, rightMember))],
			}),
			goType: DEither.unwrapRight(returnGoType),
			target: outputType,
			location: theFunctionNode,
			context,
		})
		: undefined;

	if (rightValue && DEither.isLeft(rightValue)) {
		return rightValue;
	}

	// Les autres variantes sont renvoyées telles quelles, chacune dans son membre de la sortie.
	const otherValues: GoAST.Expression[] = [];

	for (const member of otherMembers) {
		const value = await placeValue({
			expression: getMemberValue(input, either, member),
			goType: member.goType,
			target: outputType,
			location: node,
			context,
		});

		if (DEither.isLeft(value)) {
			return value;
		}

		otherValues.push(DEither.unwrapRight(value));
	}

	const outputGoType = await transformCheckerType(outputType, node, context);

	if (DEither.isLeft(outputGoType)) {
		return outputGoType;
	}

	const createBranches = (emit: (value: GoAST.Expression) => GoAST.Statement): readonly GoAST.Statement[] => {
		const block = (value: GoAST.Expression) => GoAST.createBlockStatement({ statements: [emit(value)] });

		// Chaîne `if / else if / else` sur les variantes non `Right`, la dernière sans test.
		let otherBranch: GoAST.BlockStatement | GoAST.IfStatement | undefined = undefined;

		for (const [index, member] of [...otherMembers.entries()].reverse()) {
			const value = otherValues[index];

			if (!value) {
				continue;
			}

			otherBranch = otherBranch
				? GoAST.createIfStatement({
					condition: createMembersTest(input, either, [member]),
					body: block(value),
					elseBranch: otherBranch,
				})
				: block(value);
		}

		const right = rightValue && DEither.unwrapRight(rightValue);

		if (!right) {
			return otherBranch ? [consumeVariable(theFunction), otherBranch] : [consumeVariable(theFunction)];
		}

		const test = createMembersTest(input, either, rightMembers);

		if (!otherBranch || (isConstantTest(test) && test.value)) {
			return [emit(right)];
		}

		return [
			GoAST.createIfStatement({
				condition: test,
				body: block(right),
				elseBranch: otherBranch,
			}),
		];
	};

	if (curried) {
		const inputGoType = await transformCheckerType(inputType, node, context);

		if (DEither.isLeft(inputGoType)) {
			return inputGoType;
		}

		return context.success({
			before,
			result: GoAST.createFunctionLiteral({
				arguments: [
					GoAST.createFunctionArgument({
						identifier: input,
						type: DEither.unwrapRight(inputGoType),
					}),
				],
				returnTypes: [DEither.unwrapRight(outputGoType)],
				body: GoAST.createBlockStatement({
					statements: createBranches(
						(value) => GoAST.createReturnStatement({ values: [value] }),
					),
				}),
			}),
		});
	}

	const result = context.generateIdentifier();

	return context.success({
		before: DArray.concat(
			before,
			[
				GoAST.createVariableDeclarationZeroValue({
					identifier: result,
					typeReference: DEither.unwrapRight(outputGoType),
				}),
			],
			createBranches(
				(value) => GoAST.createAssignmentStatement({
					targets: DCommon.cast([result]),
					values: DCommon.cast([value]),
				}),
			),
		),
		result,
	});
}
