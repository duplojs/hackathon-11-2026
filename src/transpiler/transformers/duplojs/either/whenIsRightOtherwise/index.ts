import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { consumeVariable, evaluateAllToVariables } from "../../../expression/evaluate";
import { transformCheckerType } from "../../../type";
import {
	createMembersTest,
	filterSide,
	getEitherValue,
	getCallbackTypes,
	getFunctionTypes,
	getMemberValue,
	isConstantTest,
	placeValue,
	resolveEitherInput,
	type FunctionTypes,
} from "../members";

interface CreateBranchValueParams {
	readonly callee: GoAST.Identifier;
	readonly types: FunctionTypes;
	readonly argument: GoAST.Expression | undefined;
	readonly outputType: Type;
	readonly location: TsAST.Node;
	readonly context: BuildContext;
}

// Appelle un callback (avec la valeur s'il déclare un paramètre) et place son résultat dans le type de sortie.
async function createBranchValue(params: CreateBranchValueParams) {
	const { callee, types, argument, outputType, location, context } = params;
	const hasParameter = !DArray.lengthEqual(types.parameters, 0);

	if (hasParameter && !argument) {
		return context.error(location, "when-is-right-otherwise-callback-argument-not-supported");
	}

	const returnGoType = await transformCheckerType(types.returnType, location, context);

	if (DEither.isLeft(returnGoType)) {
		return returnGoType;
	}

	return placeValue({
		expression: GoAST.createCallExpression({
			callee,
			arguments: hasParameter && argument ? [argument] : [],
		}),
		goType: DEither.unwrapRight(returnGoType),
		target: outputType,
		location,
		context,
	});
}

// `whenIsRightOtherwise(input, theFunction, otherwiseFunction)` : `theFunction` reçoit la valeur
// d'un `Right`, `otherwiseFunction` reçoit les autres variantes. Les variantes sont classées à la
// compilation ; le choix à l'exécution est un `if` sur l'étiquette de l'union.
// La forme à deux arguments renvoie une fonction (utilisée dans un `pipe` ou un `map`) :
// elle devient une fonction littérale Go qui capture les deux callbacks.
export async function whenIsRightOtherwiseExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "when-is-right-otherwise-reference-without-call-not-supported");
	}

	const isCurried = DArray.lengthEqual(node.arguments, 2);

	if (!isCurried && !DArray.lengthEqual(node.arguments, 3)) {
		return context.error(node, "when-is-right-otherwise-expects-two-or-three-arguments");
	}

	const { typeChecker } = context.transpilation;
	const [firstNode, secondNode, thirdNode] = node.arguments;
	const theFunctionNode = isCurried ? firstNode : secondNode;
	const otherwiseFunctionNode = isCurried ? secondNode : thirdNode;

	if (!firstNode || !theFunctionNode || !otherwiseFunctionNode) {
		return context.error(node, "when-is-right-otherwise-expects-two-or-three-arguments");
	}

	const evaluated = await evaluateAllToVariables(node.arguments, context);

	if (DEither.isLeft(evaluated)) {
		return evaluated;
	}

	const { before, identifiers } = DEither.unwrapRight(evaluated);
	const theFunction = identifiers[isCurried ? 0 : 1];
	const otherwiseFunction = identifiers[isCurried ? 1 : 2];

	if (!theFunction || !otherwiseFunction) {
		return context.error(node, "when-is-right-otherwise-expects-two-or-three-arguments");
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
		? context.generateIdentifier("eitherInput")
		: identifiers[0];

	if (!inputType || !input) {
		return context.error(node, "when-is-right-otherwise-input-not-resolved");
	}

	const eitherInput = await resolveEitherInput(inputType, node, context);

	if (DEither.isLeft(eitherInput)) {
		return eitherInput;
	}

	const either = DEither.unwrapRight(eitherInput);
	const rightMembers = filterSide(either, "right");
	const otherMembers = DArray.filter(either.members, (member) => member.side !== "right");
	const [rightMember] = rightMembers;
	const [otherMember] = otherMembers;

	if (rightMembers.length > 1) {
		return context.error(node, "when-is-right-otherwise-several-right-representations-not-supported");
	}

	const theFunctionTypes = await getCallbackTypes(theFunctionNode, context);

	if (DEither.isLeft(theFunctionTypes)) {
		return theFunctionTypes;
	}

	const otherwiseFunctionTypes = await getCallbackTypes(otherwiseFunctionNode, context);

	if (DEither.isLeft(otherwiseFunctionTypes)) {
		return otherwiseFunctionTypes;
	}

	const theFunctionResult = await createBranchValue({
		callee: theFunction,
		types: DEither.unwrapRight(theFunctionTypes),
		argument: rightMember && getEitherValue(getMemberValue(input, either, rightMember)),
		outputType,
		location: theFunctionNode,
		context,
	});

	if (DEither.isLeft(theFunctionResult)) {
		return theFunctionResult;
	}

	// `otherwiseFunction` reçoit la valeur d'entrée elle-même : en Go elle doit avoir une seule
	// représentation, celle de l'unique variante qui n'est pas un `Right`.
	const otherwiseResult = await createBranchValue({
		callee: otherwiseFunction,
		types: DEither.unwrapRight(otherwiseFunctionTypes),
		argument: otherMember && DArray.lengthEqual(otherMembers, 1)
			? getMemberValue(input, either, otherMember)
			: undefined,
		outputType,
		location: otherwiseFunctionNode,
		context,
	});

	if (DEither.isLeft(otherwiseResult)) {
		return otherwiseResult;
	}

	const outputGoType = await transformCheckerType(outputType, node, context);

	if (DEither.isLeft(outputGoType)) {
		return outputGoType;
	}

	const test = createMembersTest(input, either, rightMembers);

	const createBranches = (emit: (value: GoAST.Expression) => GoAST.Statement): readonly GoAST.Statement[] => {
		const rightBranch = emit(DEither.unwrapRight(theFunctionResult));
		const otherwiseBranch = emit(DEither.unwrapRight(otherwiseResult));

		if (isConstantTest(test)) {
			return test.value
				? [consumeVariable(otherwiseFunction), rightBranch]
				: [consumeVariable(theFunction), otherwiseBranch];
		}

		return [
			GoAST.createIfStatement({
				condition: test,
				body: GoAST.createBlockStatement({ statements: [rightBranch] }),
				elseBranch: GoAST.createBlockStatement({ statements: [otherwiseBranch] }),
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

	const result = context.generateIdentifier("whenIsRightOtherwiseResult");

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
