import { type Transformer } from "@transformer";
import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { type BuildContext } from "../../../../context/build";
import { evaluateAllToVariables } from "../../../expression/evaluate";
import { transformCheckerType, type GoType } from "../../../type";
import { eitherSuccessDependency, successFunctionIdentifier, successTypeIdentifier } from "../success/sharedDependency";
import {
	createMembersTest,
	filterSide,
	getEitherValue,
	getCallbackTypes,
	getMemberValue,
	placeValue,
	resolveEitherInput,
	unwrapPromiseType,
	type EitherMember,
} from "../members";

interface PipeStep {
	readonly value: GoAST.Identifier;
	readonly type: Type;
}

interface PipeState {
	readonly current: PipeStep;
	readonly body: readonly GoAST.Statement[];
}

interface StepStatements {
	readonly statements: readonly GoAST.Statement[];
	// Expression transmise à l'étape suivante (valeur du `Right`, ou la valeur elle-même).
	readonly forwarded: GoAST.Expression;
	readonly rightGoType: GoType | undefined;
}

interface BuildStepParams {
	readonly step: PipeStep;
	readonly outputType: Type;
	readonly outputGoType: GoType;
	readonly location: TsAST.Node;
	readonly context: BuildContext;
}

// Après chaque étape : un échec interrompt le pipe et devient le résultat (`return`).
async function buildStepStatements(params: BuildStepParams) {
	const { step, outputType, outputGoType, location, context } = params;

	const eitherInput = await resolveEitherInput(step.type, location, context);

	if (DEither.isLeft(eitherInput)) {
		return eitherInput;
	}

	const either = DEither.unwrapRight(eitherInput);
	const leftMembers = filterSide(either, "left");
	const rightMembers = filterSide(either, "right");
	const otherMembers = filterSide(either, "other");
	const [rightMember] = rightMembers;

	if (rightMembers.length > 1 || (rightMember && !DArray.lengthEqual(otherMembers, 0))) {
		return context.error(location, "right-pipe-several-right-representations-not-supported");
	}

	// Si l'étape a déjà la représentation du résultat, l'échec est retourné tel quel.
	const isOutputRepresentation = GoPrinter.renderNode(either.union.type) === GoPrinter.renderNode(outputGoType);

	// Avec la représentation du résultat, un seul test couvre tous les échecs, retournés tels quels.
	// Sinon chaque échec est placé dans son membre de l'union du résultat.
	const returnedGroups: readonly (readonly EitherMember[])[] = isOutputRepresentation
		? DArray.filter([leftMembers], (members) => !DArray.lengthEqual(members, 0))
		: DArray.map(leftMembers, (member) => [member]);

	const statements = await DCommon.asyncPipe(
		returnedGroups,
		DArray.map(
			async(members) => {
				const [member] = members;

				if (!member) {
					return context.error(location, "right-pipe-left-not-resolved");
				}

				const returned = isOutputRepresentation
					? DEither.success<GoAST.Expression>(step.value)
					: await placeValue({
						expression: getMemberValue(step.value, either, member),
						goType: member.goType,
						target: outputType,
						location,
						context,
					});

				// Toujours un `if`, même si le test est connu : un `return` nu rendrait la suite inatteignable.
				return DEither.rightPipe(
					returned,
					(value): DEither.Success<GoAST.Statement> => DEither.success(
						GoAST.createIfStatement({
							condition: createMembersTest(step.value, either, members),
							body: GoAST.createBlockStatement({
								statements: [GoAST.createReturnStatement({ values: [value] })],
							}),
						}),
					),
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

	if (DEither.isLeft(statements)) {
		return statements;
	}

	return DEither.success<StepStatements>({
		statements,
		forwarded: rightMember
			? getEitherValue(getMemberValue(step.value, either, rightMember))
			: step.value,
		rightGoType: rightMember?.goType,
	});
}

// `rightPipe(input, ...pipes)` : chaque fonction reçoit la valeur du `Right` précédent ; le premier
// échec interrompt la suite et devient le résultat. Le pipe devient une fonction Go appelée
// immédiatement : un échec se traduit par un `return` anticipé, sans imbrication de branches.
export async function rightPipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "right-pipe-reference-without-call-not-supported");
	}

	const [inputNode, ...pipeNodes] = node.arguments;

	if (!inputNode || DArray.lengthEqual(pipeNodes, 0)) {
		return context.error(node, "right-pipe-expects-input-and-pipes");
	}

	const { typeChecker } = context.transpilation;

	// Comme en JavaScript, l'entrée et les fonctions sont évaluées avant l'exécution du pipe.
	const evaluated = await evaluateAllToVariables(node.arguments, context);

	if (DEither.isLeft(evaluated)) {
		return evaluated;
	}

	const { before, identifiers } = DEither.unwrapRight(evaluated);
	const [input, ...pipes] = identifiers;

	if (!input) {
		return context.error(node, "right-pipe-expects-input-and-pipes");
	}

	const rawOutputType = await typeChecker.getTypeAtLocation(node);
	const outputType = await unwrapPromiseType(rawOutputType, context);
	const outputGoTypeResult = await transformCheckerType(outputType, node, context);

	if (DEither.isLeft(outputGoTypeResult)) {
		return outputGoTypeResult;
	}

	const outputGoType = DEither.unwrapRight(outputGoTypeResult);

	const pipeReturnTypes = await DCommon.asyncPipe(
		pipeNodes,
		DArray.map(
			async(pipeNode) => DEither.rightPipe(
				await getCallbackTypes(pipeNode, context),
				({ returnType }) => DEither.success(returnType),
			),
		),
		DCommon.promiseAll,
	);

	// Chaque étape : test d'échec sur la valeur courante, puis appel de la fonction suivante sur la
	// valeur du `Right`. Le résultat de l'appel devient la valeur courante de l'étape suivante.
	const pipeline = await DGenerator.asyncReduce(
		DArray.map(pipes, (pipe, { index }) => ({
			pipe,
			returnType: pipeReturnTypes[index],
		})),
		DGenerator.reduceFrom<PipeState>({
			current: {
				value: input,
				type: await typeChecker.getTypeAtLocation(inputNode),
			},
			body: [],
		}),
		async({ item: { pipe, returnType }, lastValue, next, exit }) => {
			const step = await buildStepStatements({
				step: lastValue.current,
				outputType,
				outputGoType,
				location: node,
				context,
			});

			if (DEither.isLeft(step)) {
				return exit(step);
			}

			if (!returnType || DEither.isLeft(returnType)) {
				return exit(returnType ?? context.error(node, "right-pipe-function-not-resolved"));
			}

			const { statements, forwarded } = DEither.unwrapRight(step);
			const call = GoAST.createShortVariableDeclarationStatement({
				identifier: context.generateIdentifier("stepResult"),
				initializer: GoAST.createCallExpression({
					callee: pipe,
					arguments: [forwarded],
				}),
			});

			return next({
				current: {
					value: call.identifier,
					type: DEither.unwrapRight(returnType),
				},
				body: DArray.concat(lastValue.body, statements, [call]),
			});
		},
	);

	if (DEither.isLeft(pipeline)) {
		return pipeline;
	}

	const { current, body } = pipeline;

	const lastStep = await buildStepStatements({
		step: current,
		outputType,
		outputGoType,
		location: node,
		context,
	});

	if (DEither.isLeft(lastStep)) {
		return lastStep;
	}

	const { statements, rightGoType: lastRightGoType } = DEither.unwrapRight(lastStep);

	const lastGoTypeResult = await transformCheckerType(current.type, node, context);

	if (DEither.isLeft(lastGoTypeResult)) {
		return lastGoTypeResult;
	}

	const lastGoType = DEither.unwrapRight(lastGoTypeResult);
	const isLastOutputRepresentation = GoPrinter.renderNode(lastGoType) === GoPrinter.renderNode(outputGoType);

	// Dernière valeur : déjà dans la représentation du résultat, un `Right` à placer dans
	// l'union, ou une valeur simple enveloppée dans un `Success` (comme le fait `rightPipe`).
	const finalValue = await DCommon.justExec(async() => {
		if (isLastOutputRepresentation) {
			return DEither.success<GoAST.Expression>(current.value);
		}

		if (lastRightGoType) {
			const eitherInput = await resolveEitherInput(current.type, node, context);

			if (DEither.isLeft(eitherInput)) {
				return eitherInput;
			}

			const either = DEither.unwrapRight(eitherInput);
			const [rightMember] = filterSide(either, "right");

			return placeValue({
				expression: rightMember ? getMemberValue(current.value, either, rightMember) : current.value,
				goType: lastRightGoType,
				target: outputType,
				location: node,
				context,
			});
		}

		const successType = GoAST.createGenericTypeReference({
			typeReference: GoAST.createPackageTypeReference({
				packageName: context.registerSharedDependency(eitherSuccessDependency.value),
				identifier: successTypeIdentifier,
			}),
			typeArguments: DCommon.cast([lastGoType]),
		});

		return placeValue({
			expression: GoAST.createCallExpression({
				callee: GoAST.createInstantiationExpression({
					target: GoAST.createSelectorExpression({
						target: context.registerSharedDependency(eitherSuccessDependency.value),
						identifier: successFunctionIdentifier,
					}),
					typeArguments: DCommon.cast([lastGoType]),
				}),
				arguments: [current.value],
			}),
			goType: successType,
			target: outputType,
			location: node,
			context,
		});
	});

	if (DEither.isLeft(finalValue)) {
		return finalValue;
	}

	return context.success({
		before,
		result: GoAST.createCallExpression({
			callee: GoAST.createFunctionLiteral({
				arguments: [],
				returnTypes: [outputGoType],
				body: GoAST.createBlockStatement({
					statements: DArray.concat(
						body,
						// Déjà dans la représentation du résultat, la dernière valeur est retournée
						// telle quelle, échec compris : le test d'échec serait redondant.
						isLastOutputRepresentation ? [] : statements,
						[GoAST.createReturnStatement({ values: [DEither.unwrapRight(finalValue)] })],
					),
				}),
			}),
			arguments: [],
		}),
	});
}
