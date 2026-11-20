import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { evaluateToVariable } from "../../../expression/evaluate";
import { transformCheckerType } from "../../../type";
import { createFunctionValue } from "../../functionValue";
import {
	createMembersTest,
	getEitherValue,
	getMemberValue,
	placeValue,
	resolveEitherInput,
} from "../members";

interface CreateUnwrapRightParams {
	readonly input: GoAST.Identifier;
	readonly inputType: Type;
	readonly outputType: Type;
	readonly location: TsAST.Node;
	readonly context: BuildContext;
}

// `unwrapRight(input)` : la valeur d'un `Right` est extraite, toute autre variante (un échec) est
// renvoyée telle quelle. Chaque membre de l'union d'entrée est placé dans le membre correspondant
// de la sortie ; le choix à l'exécution est un test d'étiquette.
async function createUnwrapRight(params: CreateUnwrapRightParams) {
	const { input, inputType, outputType, location, context } = params;

	const eitherInput = await resolveEitherInput(inputType, location, context);

	if (DEither.isLeft(eitherInput)) {
		return eitherInput;
	}

	const either = DEither.unwrapRight(eitherInput);

	const outputGoType = await transformCheckerType(outputType, location, context);

	if (DEither.isLeft(outputGoType)) {
		return outputGoType;
	}

	const result = context.generateIdentifier("unwrappedValue");
	const branches = await DCommon.asyncPipe(
		either.members,
		DArray.map(
			async(member) => {
				const memberValue = getMemberValue(input, either, member);
				const isRight = member.side === "right";

				// La valeur d'un Right a le type Go du paramètre de sa struct (`EitherRight[string]` → `string`).
				const [valueGoType] = isRight && DModeling.hasTagValue(member.goType, "[node]type-reference-generic")
					? member.goType.typeArguments
					: [];

				if (isRight && !valueGoType) {
					return context.error(location, "unwrap-right-value-type-not-resolved");
				}

				const placed = await placeValue({
					expression: isRight ? getEitherValue(memberValue) : memberValue,
					goType: valueGoType ?? member.goType,
					target: outputType,
					location,
					context,
				});

				if (DEither.isLeft(placed)) {
					return placed;
				}

				const assignment = GoAST.createAssignmentStatement({
					targets: DCommon.cast([result]),
					values: DCommon.cast([DEither.unwrapRight(placed)]),
				});

				return DEither.success<GoAST.Statement>(
					DArray.lengthEqual(either.members, 1)
						? assignment
						: GoAST.createIfStatement({
							condition: createMembersTest(input, either, [member]),
							body: GoAST.createBlockStatement({ statements: [assignment] }),
						}),
				);
			},
		),
		DCommon.promiseAll,
		DArray.reduce(
			DArray.reduceFrom<readonly GoAST.Statement[]>([]),
			({ element, lastValue, next, exit }) => DEither.isLeft(element)
				? exit(element)
				: next(DArray.push(lastValue, DEither.unwrapRight(element))),
		),
	);

	if (DEither.isLeft(branches)) {
		return branches;
	}

	return DEither.success({
		before: DArray.concat(
			[
				GoAST.createVariableDeclarationZeroValue({
					identifier: result,
					typeReference: DEither.unwrapRight(outputGoType),
				}),
			],
			branches,
		),
		result,
	});
}

export async function unwrapRightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const { typeChecker } = context.transpilation;

	// Passée en valeur (`pipe(result, DEither.unwrapRight)`) : fonction Go typée selon le contexte.
	if (!TsAST.isCallExpression(node)) {
		return createFunctionValue(
			node,
			context,
			async([parameter], returnType) => {
				if (!parameter) {
					return context.error(node, "unwrap-right-expects-one-argument");
				}

				return createUnwrapRight({
					input: parameter.identifier,
					inputType: parameter.type,
					outputType: returnType,
					location: node,
					context,
				});
			},
		);
	}

	const [inputNode] = node.arguments;

	if (!inputNode || !DArray.lengthEqual(node.arguments, 1)) {
		return context.error(node, "unwrap-right-expects-one-argument");
	}

	const input = await evaluateToVariable(inputNode, context);

	if (DEither.isLeft(input)) {
		return input;
	}

	const unwrapped = await createUnwrapRight({
		input: DEither.unwrapRight(input).identifier,
		inputType: await typeChecker.getTypeAtLocation(inputNode),
		outputType: await typeChecker.getTypeAtLocation(node),
		location: node,
		context,
	});

	if (DEither.isLeft(unwrapped)) {
		return unwrapped;
	}

	return context.success({
		before: DArray.concat(DEither.unwrapRight(input).before, DEither.unwrapRight(unwrapped).before),
		result: DEither.unwrapRight(unwrapped).result,
	});
}
