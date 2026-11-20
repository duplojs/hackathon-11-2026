import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import {
	eitherDependency,
	eitherTypeIdentifier,
	getValueMethodIdentifier,
	isRightMethodIdentifier,
} from "../sharedDependency";
import { invokeCallable, getEitherRightValueType } from "../../callable";

export async function rightPipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (!TsAST.isCallExpression(node) || node.arguments.length < 2) {
		return context.notSupport();
	}

	const { typeChecker } = context.transpilation;

	const [initArg] = node.arguments;
	if (!initArg) {
		return context.error(node, "rightPipe-missing-init-argument");
	}
	const transformedInit = await DCommon.asyncPipe(
		context.transform(initArg, expressionTransformers.value),
		DEither.unwrapRight,
	);
	if (DEither.isLeft(transformedInit)) {
		return transformedInit;
	}

	const eitherPkg = context.registerSharedDependency(eitherDependency.value);
	const eitherTypeRef = GoAST.createPackageTypeReference({
		packageName: eitherPkg,
		identifier: eitherTypeIdentifier,
	});

	const resultVar = context.generateIdentifier();
	const beforeStatements: GoAST.Statement[] = [
		...(transformedInit.before ?? []),
		GoAST.createVariableDeclarationZeroValue({
			identifier: resultVar,
			typeReference: eitherTypeRef,
		}),
		GoAST.createAssignmentStatement({
			targets: DCommon.cast([resultVar]),
			values: DCommon.cast([transformedInit.result]),
		}),
	];

	// Construire les blocs imbriqués if resultVar.IsRight() de l'intérieur vers l'extérieur
	// pour chaque étape en séquence
	let currentIfTarget = beforeStatements;

	for (let stepIndex = 1; stepIndex < node.arguments.length; stepIndex++) {
		const stepNode = node.arguments[stepIndex];
		if (!stepNode) {
			return context.error(node, "rightPipe-missing-step-argument");
		}

		// Résolution du type attendu par l'étape courante
		const prevArg = node.arguments[stepIndex - 1];
		if (!prevArg) {
			return context.error(node, "rightPipe-missing-prev-argument");
		}
		const prevType = await typeChecker.getTypeAtLocation(prevArg);
		const rightValueType = await getEitherRightValueType(prevType, stepNode, context);

		let argExpr: GoAST.Expression = resultVar;
		if (rightValueType) {
			argExpr = GoAST.createTypeAssertionExpression({
				target: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: resultVar,
						identifier: getValueMethodIdentifier,
					}),
					arguments: [],
				}),
				typeReference: rightValueType,
			});
		}

		const invoked = await DCommon.asyncPipe(
			invokeCallable(stepNode, argExpr, context),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(invoked)) {
			return context.error(stepNode, "rightPipe-step-callable-error");
		}

		const stepBodyStatements: GoAST.Statement[] = [
			...invoked.before,
			GoAST.createAssignmentStatement({
				targets: DCommon.cast([resultVar]),
				values: DCommon.cast([invoked.result]),
			}),
		];

		const ifStmt = GoAST.createIfStatement({
			condition: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: resultVar,
					identifier: isRightMethodIdentifier,
				}),
				arguments: [],
			}),
			body: GoAST.createBlockStatement({
				statements: stepBodyStatements,
			}),
		});

		currentIfTarget.push(ifStmt);
		currentIfTarget = stepBodyStatements;
	}

	return context.success({
		before: beforeStatements,
		result: resultVar,
	});
}
