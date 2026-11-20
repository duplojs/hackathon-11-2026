import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { evaluateToVariable } from "../../../expression/evaluate";
import { transformCheckerType } from "../../../type";
import {
	createMembersTest,
	getCallbackTypes,
	getEitherValue,
	getFunctionTypes,
	getMemberValue,
	placeValue,
	resolveEitherInput,
	type EitherInput,
	type EitherMember,
} from "../members";

interface MatcherCase {
	readonly information: string;
	readonly handler: GoAST.Identifier;
	readonly hasParameter: boolean;
	readonly returnType: Type;
	readonly location: TsAST.Node;
}

interface MatcherCases {
	readonly before: readonly GoAST.Statement[];
	readonly cases: readonly MatcherCase[];
}

// Information imposée par une variante, sans argument de type à lire.
const fixedInformations: ReadonlyMap<string, string> = new Map([
	["Success", "success"],
	["Fail", "fail"],
	["Error", "error"],
]);

// Information littérale d'un type Either : le premier argument de `Left<"…", V>` ou `Right<"…", V>`,
// ou celle imposée par la variante (`Success` : `"success"`, `Fail` : `"fail"`, `Error` : `"error"`).
async function getInformation(source: Type, location: TsAST.Node, context: BuildContext) {
	const typeNode = await context.transpilation.typeChecker.typeToTypeNode(source, location);

	if (!typeNode || !TsAST.isTypeReferenceNode(typeNode)) {
		return context.error(location, "match-information-information-not-resolved");
	}

	const name = TsAST.isIdentifier(typeNode.typeName)
		? typeNode.typeName.text
		: typeNode.typeName.right.text;

	const fixedInformation = fixedInformations.get(name);

	if (fixedInformation !== undefined) {
		return DEither.success(fixedInformation);
	}

	const [informationNode] = typeNode.typeArguments ?? [];

	if (
		(name !== "Left" && name !== "Right")
		|| !informationNode
		|| !TsAST.isLiteralTypeNode(informationNode)
		|| !TsAST.isStringLiteral(informationNode.literal)
	) {
		return context.error(location, "match-information-information-not-resolved");
	}

	return DEither.success(informationNode.literal.text);
}

// Informations possibles d'un membre : une par type TypeScript représenté par ce membre
// (`Left<"division-by-zero", 0>` et `Left<"negative-operand", number>` partagent `EitherLeft[float64]`).
function getMemberInformations(
	sources: readonly Type[],
	location: TsAST.Node,
	context: BuildContext,
) {
	return DCommon.asyncPipe(
		sources,
		DArray.map((source) => getInformation(source, location, context)),
		DCommon.promiseAll,
		DArray.reduce(
			DArray.reduceFrom<readonly string[]>([]),
			({ element, lastValue, next, exit }) => DEither.isLeft(element)
				? exit(element)
				: next(DArray.push(lastValue, DEither.unwrapRight(element))),
		),
	);
}

// Chaque propriété du matcher : le traitement est évalué dans l'ordre des propriétés, comme en JavaScript.
function createMatcherCases(
	matcherNode: TsAST.ObjectLiteralExpression,
	context: BuildContext,
) {
	return DCommon.asyncPipe(
		matcherNode.properties,
		DArray.map(
			async(property) => {
				if (
					!TsAST.isPropertyAssignment(property)
					|| !(TsAST.isIdentifier(property.name) || TsAST.isStringLiteral(property.name))
				) {
					return context.error(property, "match-information-property-not-supported");
				}

				const handler = await evaluateToVariable(property.initializer, context);

				if (DEither.isLeft(handler)) {
					return handler;
				}

				const handlerTypes = await getCallbackTypes(property.initializer, context);

				if (DEither.isLeft(handlerTypes)) {
					return handlerTypes;
				}

				const { parameters, returnType } = DEither.unwrapRight(handlerTypes);

				return DEither.success({
					before: DEither.unwrapRight(handler).before,
					matcherCase: {
						information: property.name.text,
						handler: DEither.unwrapRight(handler).identifier,
						hasParameter: !DArray.lengthEqual(parameters, 0),
						returnType,
						location: property.initializer,
					},
				});
			},
		),
		DCommon.promiseAll,
		DArray.reduce(
			DArray.reduceFrom<MatcherCases>({
				before: [],
				cases: [],
			}),
			({ element, lastValue, next, exit }) => {
				if (DEither.isLeft(element)) {
					return exit(element);
				}

				const { before, matcherCase } = DEither.unwrapRight(element);

				return next({
					before: DArray.concat(lastValue.before, before),
					cases: DArray.push(lastValue.cases, matcherCase),
				});
			},
		),
	);
}

interface CreateMemberStatementsParams {
	readonly member: EitherMember;
	readonly input: GoAST.Identifier;
	readonly either: EitherInput;
	readonly cases: readonly MatcherCase[];
	readonly outputType: Type;
	assign(value: GoAST.Expression): GoAST.Statement;
	readonly location: TsAST.Node;
	readonly context: BuildContext;
}

// Instructions pour un membre de l'union : un `if` par information possible, ou la valeur
// renvoyée telle quelle si le membre n'est pas un Either.
async function createMemberStatements(params: CreateMemberStatementsParams) {
	const { member, input, either, cases, outputType, assign, location, context } = params;
	const memberValue = getMemberValue(input, either, member);

	if (member.side === "other") {
		return DEither.rightPipe(
			await placeValue({
				expression: memberValue,
				goType: member.goType,
				target: outputType,
				location,
				context,
			}),
			(value) => DEither.success<readonly GoAST.Statement[]>([assign(value)]),
		);
	}

	const informations = await getMemberInformations(either.union.sources[member.index] ?? [], location, context);

	if (DEither.isLeft(informations)) {
		return informations;
	}

	return DCommon.asyncPipe(
		cases,
		DArray.filter((matcherCase) => DArray.includes(informations, matcherCase.information)),
		DArray.map(
			async(matcherCase) => {
				const returnGoType = await transformCheckerType(matcherCase.returnType, matcherCase.location, context);

				if (DEither.isLeft(returnGoType)) {
					return returnGoType;
				}

				const value = await placeValue({
					expression: GoAST.createCallExpression({
						callee: matcherCase.handler,
						arguments: matcherCase.hasParameter ? [getEitherValue(memberValue)] : [],
					}),
					goType: DEither.unwrapRight(returnGoType),
					target: outputType,
					location: matcherCase.location,
					context,
				});

				if (DEither.isLeft(value)) {
					return value;
				}

				const assignment = assign(DEither.unwrapRight(value));

				// Une seule information possible : pas de test à l'exécution.
				return DEither.success<GoAST.Statement>(
					DArray.lengthEqual(informations, 1)
						? assignment
						: GoAST.createIfStatement({
							condition: GoAST.createBinaryExpression({
								operator: "==",
								left: GoAST.createSelectorExpression({
									target: memberValue,
									identifier: GoAST.createIdentifier("Information"),
								}),
								right: GoAST.createStringLiteral({ value: matcherCase.information }),
							}),
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
		(statements) => DEither.isLeft(statements) ? statements : DEither.success(statements),
	);
}

// `matchInformation(input, { information: handler, … })` : le traitement est choisi selon
// l'information du résultat et reçoit sa valeur. Le membre de l'union est choisi par son
// étiquette ; plusieurs `Left` peuvent partager une représentation Go, l'information (une chaîne)
// les départage alors à l'exécution. Une valeur qui n'est pas un Either est renvoyée telle quelle.
// La forme à un argument renvoie une fonction : elle devient une fonction littérale Go.
export async function matchInformationExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "match-information-reference-without-call-not-supported");
	}

	const isCurried = DArray.lengthEqual(node.arguments, 1);

	if (!isCurried && !DArray.lengthEqual(node.arguments, 2)) {
		return context.error(node, "match-information-expects-one-or-two-arguments");
	}

	const { typeChecker } = context.transpilation;
	const [firstNode, secondNode] = node.arguments;
	const matcherNode = isCurried ? firstNode : secondNode;

	if (!firstNode || !matcherNode || !TsAST.isObjectLiteralExpression(matcherNode)) {
		return context.error(node, "match-information-expects-object-literal-matcher");
	}

	// Comme en JavaScript : l'entrée, puis chaque traitement dans l'ordre des propriétés.
	const input = isCurried
		? undefined
		: await evaluateToVariable(firstNode, context);

	if (input && DEither.isLeft(input)) {
		return input;
	}

	const matcher = await createMatcherCases(matcherNode, context);

	if (DEither.isLeft(matcher)) {
		return matcher;
	}

	const before = DArray.concat(input ? DEither.unwrapRight(input).before : [], matcher.before);
	const callType = await typeChecker.getTypeAtLocation(node);

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
	const inputIdentifier = curried
		? context.generateIdentifier("matchInput")
		: input && DEither.unwrapRight(input).identifier;

	if (!inputType || !inputIdentifier) {
		return context.error(node, "match-information-input-not-resolved");
	}

	const eitherInput = await resolveEitherInput(inputType, node, context);

	if (DEither.isLeft(eitherInput)) {
		return eitherInput;
	}

	const either = DEither.unwrapRight(eitherInput);

	const outputGoType = await transformCheckerType(outputType, node, context);

	if (DEither.isLeft(outputGoType)) {
		return outputGoType;
	}

	const result = context.generateIdentifier("matchResult");
	const assign = (value: GoAST.Expression) => GoAST.createAssignmentStatement({
		targets: DCommon.cast([result]),
		values: DCommon.cast([value]),
	});

	const branches = await DCommon.asyncPipe(
		either.members,
		DArray.map(
			async(member) => DEither.rightPipe(
				await createMemberStatements({
					member,
					input: inputIdentifier,
					either,
					cases: matcher.cases,
					outputType,
					assign,
					location: node,
					context,
				}),
				(statements): DEither.Success<GoAST.Statement> => DEither.success(
					DArray.lengthEqual(either.members, 1)
						? GoAST.createBlockStatement({ statements })
						: GoAST.createIfStatement({
							condition: createMembersTest(inputIdentifier, either, [member]),
							body: GoAST.createBlockStatement({ statements }),
						}),
				),
			),
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

	const body = DArray.concat(
		[
			GoAST.createVariableDeclarationZeroValue({
				identifier: result,
				typeReference: DEither.unwrapRight(outputGoType),
			}),
		],
		branches,
	);

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
						identifier: inputIdentifier,
						type: DEither.unwrapRight(inputGoType),
					}),
				],
				returnTypes: [DEither.unwrapRight(outputGoType)],
				body: GoAST.createBlockStatement({
					statements: DArray.push(body, GoAST.createReturnStatement({ values: [result] })),
				}),
			}),
		});
	}

	return context.success({
		before: DArray.concat(before, body),
		result,
	});
}
