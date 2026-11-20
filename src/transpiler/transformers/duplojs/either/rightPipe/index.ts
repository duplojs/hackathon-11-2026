import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import { TypeFlags } from "typescript/async";
import { type NotfoundTransformer, type TransformationError } from "@transformer";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { goTypeOf, goTypeOfExpression, type GoType } from "../../../type/goTypeOf";
import {
	callbackApplication,
	resolveCallback,
	type Callback,
	type TypedExpression,
} from "../../application";
import { coerceGoExpression } from "../coerce";
import {
	getEither2GoTypes,
	getEitherValueAccess,
} from "../goType";
import {
	either2SuccessFunctionIdentifier,
	eitherDependency,
	eitherSuccessFunctionIdentifier,
} from "../sharedDependency";

const isLeftMethodIdentifier = GoAST.createIdentifier("IsLeft");

async function assignResult(
	params: {
		value: TypedExpression;
		resultIdentifier: GoAST.Identifier;
		resultGoType: GoType;
		site: TsAST.Node;
	},
	context: BuildContext,
) {
	const { value, resultIdentifier, resultGoType, site } = params;

	const targetEither2Types = DEither.unwrapRight(getEither2GoTypes(resultGoType));
	const targetValueAccess = DEither.unwrapRight(getEitherValueAccess(resultGoType));
	const sourceValueAccess = DEither.unwrapRight(getEitherValueAccess(value.goType));

	if (DEither.isLeft(sourceValueAccess)) {
		if (
			!DEither.isLeft(targetEither2Types)
			&& GoPrinter.renderNode(value.goType)
				=== GoPrinter.renderNode(targetEither2Types.rightType)
		) {
			const packageName = context.registerSharedDependency(eitherDependency.value);

			return DEither.right("rightpipe-branch", [
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([resultIdentifier]),
					values: DCommon.cast([
						GoAST.createCallExpression({
							callee: GoAST.createInstantiationExpression({
								target: GoAST.createSelectorExpression({
									target: packageName,
									identifier: either2SuccessFunctionIdentifier,
								}),
								typeArguments: DCommon.cast([
									targetEither2Types.leftType,
									targetEither2Types.rightType,
								]),
							}),
							arguments: [value.expression],
						}),
					]),
				}),
			]);
		}

		if (
			DEither.isLeft(targetEither2Types)
			&& !DEither.isLeft(targetValueAccess)
			&& GoPrinter.renderNode(value.goType)
				=== GoPrinter.renderNode(targetValueAccess.valueType)
		) {
			const packageName = context.registerSharedDependency(eitherDependency.value);

			return DEither.right("rightpipe-branch", [
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([resultIdentifier]),
					values: DCommon.cast([
						GoAST.createCallExpression({
							callee: GoAST.createInstantiationExpression({
								target: GoAST.createSelectorExpression({
									target: packageName,
									identifier: eitherSuccessFunctionIdentifier,
								}),
								typeArguments: DCommon.cast([targetValueAccess.valueType]),
							}),
							arguments: [value.expression],
						}),
					]),
				}),
			]);
		}
	}

	const coerced = DEither.unwrapRight(
		await coerceGoExpression(
			{
				expression: value.expression,
				fromGoType: value.goType,
				toGoType: resultGoType,
				from: value.type,
			},
			context,
		),
	);

	if (DEither.isLeft(coerced)) {
		return context.error(site, "duplojs-either-rightpipe-unsupported-coercion");
	}

	return DEither.right("rightpipe-branch", [
		...coerced.before,
		GoAST.createAssignmentStatement({
			targets: DCommon.cast([resultIdentifier]),
			values: DCommon.cast([coerced.result]),
		}),
	]);
}

async function applyCallback(
	callback: Callback,
	value: TypedExpression,
	context: BuildContext,
) {
	const application = DEither.unwrapRight(
		await callback.apply([value]),
	);

	if (DEither.isLeft(application)) {
		return application;
	}

	return callbackApplication({
		...application,
		before: [...callback.before, ...application.before],
	});
}

function collectIdentifiers(root: TsAST.Node) {
	const identifiers: TsAST.Identifier[] = [];

	const visit = (node: TsAST.Node) => {
		if (TsAST.isIdentifier(node)) {
			identifiers.push(node);
		}

		node.forEachChild(visit);
	};

	visit(root);

	return identifiers;
}

async function parameterIsRead(
	parameter: TsAST.Identifier,
	candidates: readonly TsAST.Identifier[],
	context: BuildContext,
) {
	const checker = context.transpilation.typeChecker;
	const symbol = await checker.getSymbolAtLocation(parameter);

	if (!symbol) {
		return context.error(parameter, "rightpipe-callback-parameter-symbol-not-found");
	}

	for (const candidate of candidates) {
		const candidateSymbol = await checker.getSymbolAtLocation(candidate);

		if (candidateSymbol?.id === symbol.id) {
			return DEither.right("parameter-read", true);
		}
	}

	return DEither.right("parameter-read", false);
}

// D22 : une étape dont le paramètre est typé `never` par TypeScript ne peut jamais être
// appelée (l'étape précédente, ou l'entrée, ne produit que des gauches). C'est fidèle à
// JS, où rightPipe s'arrête au premier gauche : le pipe s'arrête AVANT cette étape, au
// lieu de traduire un paramètre `never` qui n'a pas de type Go.
async function isUnreachableStep(node: TsAST.Expression, context: BuildContext) {
	if (!TsAST.isArrowFunction(node) && !TsAST.isFunctionExpression(node)) {
		return false;
	}

	const [parameter] = node.parameters;

	if (!parameter) {
		return false;
	}

	const { typeChecker } = context.transpilation;
	const signature = await typeChecker.getSignatureFromDeclaration(node);
	const parameterType = await typeChecker.getParameterType(signature, 0);

	return (parameterType.flags & TypeFlags.Never) !== 0;
}

async function resolveRightPipeCallback(
	node: TsAST.Expression,
	context: BuildContext,
) {
	if (!TsAST.isArrowFunction(node)) {
		return resolveCallback(node, context);
	}

	if (
		TsAST.isBlock(node.body)
		|| node.parameters.some((parameter) => (
			!TsAST.isIdentifier(parameter.name)
			|| parameter.initializer
			|| parameter.dotDotDotToken
		))
	) {
		return resolveCallback(node, context);
	}

	const body = node.body;
	const bodyIdentifiers = collectIdentifiers(body);

	return DEither.right("callback", {
		before: [],
		arity: node.parameters.length,
		apply: async(argumentsList: readonly TypedExpression[]) => {
			const parameterBindings: GoAST.Statement[] = [];

			for (const [index, parameter] of node.parameters.entries()) {
				if (!TsAST.isIdentifier(parameter.name)) {
					return context.error(parameter, "rightpipe-destructured-callback-parameter-not-supported");
				}

				const argument = argumentsList[index];

				if (!argument) {
					return context.error(parameter, "rightpipe-callback-argument-is-missing");
				}

				const isRead = DEither.unwrapRight(
					await parameterIsRead(parameter.name, bodyIdentifiers, context),
				);

				if (DEither.isLeft(isRead)) {
					return isRead;
				}

				if (isRead) {
					parameterBindings.push(
						GoAST.createShortVariableDeclarationStatement({
							identifier: context.createSourceIdentifier(parameter.name.text),
							initializer: argument.expression,
						}),
					);
				}
			}

			const expression = DEither.unwrapRight(
				await context.transform(body, expressionTransformers.value),
			);

			if (DEither.isLeft(expression)) {
				return expression;
			}

			const goType = DEither.unwrapRight(
				await goTypeOfExpression(body, context),
			);

			if (DEither.isLeft(goType)) {
				return goType;
			}

			return callbackApplication({
				before: [...parameterBindings, ...expression.before],
				expression: expression.result,
				goType: goType.result,
				type: await context.transpilation.typeChecker.getTypeAtLocation(body),
			});
		},
	});
}

async function continueWithApplication(params: {
	application: TypedExpression & { before: readonly GoAST.Statement[] };
	stageIndex: number;
	callbacks: readonly Callback[];
	resultIdentifier: GoAST.Identifier;
	resultGoType: GoType;
	site: TsAST.Node;
	context: BuildContext;
}) {
	const { application, stageIndex, callbacks, resultIdentifier, resultGoType, site, context } = params;
	const stageIdentifier = context.generateIdentifier();
	const next = DEither.unwrapRight(
		await buildStages({
			value: {
				expression: stageIdentifier,
				goType: application.goType,
				type: application.type,
			},
			stageIndex,
			callbacks,
			resultIdentifier,
			resultGoType,
			site,
			context,
		}),
	);

	if (DEither.isLeft(next)) {
		return next;
	}

	return DEither.right("rightpipe-branch", [
		GoAST.createVariableDeclarationZeroValue({
			identifier: stageIdentifier,
			typeReference: application.goType,
		}),
		GoAST.createBlockStatement({
			statements: [
				...application.before,
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([stageIdentifier]),
					values: DCommon.cast([application.expression]),
				}),
			],
		}),
		...next,
	]);
}

async function buildStages(params: {
	value: TypedExpression;
	stageIndex: number;
	callbacks: readonly Callback[];
	resultIdentifier: GoAST.Identifier;
	resultGoType: GoType;
	site: TsAST.Node;
	context: BuildContext;
}): Promise<
	| DEither.Right<"rightpipe-branch", readonly GoAST.Statement[]>
	| TransformationError
	| NotfoundTransformer
> {
	const { value, stageIndex, callbacks, resultIdentifier, resultGoType, site, context } = params;
	const callback = callbacks[stageIndex];

	if (!callback) {
		return assignResult({
			value,
			resultIdentifier,
			resultGoType,
			site,
		}, context);
	}

	const eitherValueAccess = DEither.unwrapRight(getEitherValueAccess(value.goType));

	if (DEither.isLeft(eitherValueAccess)) {
		const application = DEither.unwrapRight(
			await applyCallback(callback, value, context),
		);

		if (DEither.isLeft(application)) {
			return application;
		}

		return continueWithApplication({
			application,
			stageIndex: stageIndex + 1,
			callbacks,
			resultIdentifier,
			resultGoType,
			site,
			context,
		});
	}

	const leftBranch = DEither.unwrapRight(
		await assignResult({
			value,
			resultIdentifier,
			resultGoType,
			site,
		}, context),
	);

	if (DEither.isLeft(leftBranch)) {
		return leftBranch;
	}

	const rightValue = GoAST.createSelectorExpression({
		target: value.expression,
		identifier: eitherValueAccess.field,
	});
	const application = DEither.unwrapRight(
		await applyCallback(
			callback,
			{
				expression: rightValue,
				goType: eitherValueAccess.valueType,
			},
			context,
		),
	);

	if (DEither.isLeft(application)) {
		return application;
	}

	const rightStatements = DEither.unwrapRight(
		await continueWithApplication({
			application,
			stageIndex: stageIndex + 1,
			callbacks,
			resultIdentifier,
			resultGoType,
			site,
			context,
		}),
	);

	if (DEither.isLeft(rightStatements)) {
		return rightStatements;
	}

	return DEither.right("rightpipe-branch", [
		GoAST.createIfStatement({
			condition: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: value.expression,
					identifier: isLeftMethodIdentifier,
				}),
				arguments: [],
			}),
			body: GoAST.createBlockStatement({ statements: leftBranch }),
			elseBranch: GoAST.createBlockStatement({ statements: rightStatements }),
		}),
	]);
}

export async function rightPipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (!TsAST.isCallExpression(node) || node.arguments.length < 2) {
		return context.error(node, "duplojs-either-rightpipe-requires-an-input-and-at-least-one-step");
	}

	const [inputNode, ...callbackNodes] = node.arguments;

	if (!inputNode || callbackNodes.some(TsAST.isSpreadElement)) {
		return context.error(node, "duplojs-either-rightpipe-spread-steps-are-not-supported");
	}

	const input = DEither.unwrapRight(
		await context.transform(inputNode, expressionTransformers.value),
	);

	if (DEither.isLeft(input)) {
		return input;
	}

	const inputGoType = DEither.unwrapRight(await goTypeOfExpression(inputNode, context));

	if (DEither.isLeft(inputGoType)) {
		return inputGoType;
	}

	const resolvedCallbacks: Callback[] = [];

	for (const callbackNode of callbackNodes) {
		if (await isUnreachableStep(callbackNode, context)) {
			break;
		}

		const callback = DEither.unwrapRight(
			await resolveRightPipeCallback(callbackNode, context),
		);

		if (DEither.isLeft(callback)) {
			return callback;
		}

		resolvedCallbacks.push(callback);
	}

	const inputIdentifier = context.generateIdentifier();
	const resultIdentifier = context.generateIdentifier();
	const resultGoType = DEither.unwrapRight(
		await goTypeOf(await context.transpilation.typeChecker.getTypeAtLocation(node), node, context),
	);

	if (DEither.isLeft(resultGoType)) {
		return resultGoType;
	}

	const branches = DEither.unwrapRight(
		await buildStages({
			value: {
				expression: inputIdentifier,
				goType: inputGoType.result,
				type: await context.transpilation.typeChecker.getTypeAtLocation(inputNode),
			},
			stageIndex: 0,
			callbacks: resolvedCallbacks,
			resultIdentifier,
			resultGoType: resultGoType.result,
			site: node,
			context,
		}),
	);

	if (DEither.isLeft(branches)) {
		return branches;
	}

	return context.success({
		before: [
			...input.before,
			GoAST.createShortVariableDeclarationStatement({
				identifier: inputIdentifier,
				initializer: input.result,
			}),
			GoAST.createVariableDeclarationZeroValue({
				identifier: resultIdentifier,
				typeReference: resultGoType.result,
			}),
			...branches,
		],
		result: resultIdentifier,
	});
}
