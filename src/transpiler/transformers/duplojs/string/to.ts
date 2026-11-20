import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import { type Transformer } from "@transformer";
import { type BuildContext } from "../../../context/build";
import { expressionTransformers } from "../../expression";
import { goTypeOfExpression } from "../../type/goTypeOf";
import {
	inspectSharedDependency,
	jsNumberToStringFunctionIdentifier,
} from "../../../sharedDependency/defaults/inspect";
import {
	callbackApplication,
	createInlineFunctionValue,
	type InlineFunction,
} from "../application";

/**
 * DString.to(x) (`${x}` en JS) inliné d'après le type Go de x (ADR-6 amendé) :
 * - float64 : JSNumberToString(x), le format de String(n) (`-0` donne "0") ;
 * - string : x ;
 * - bool : "true" ou "false" (if/else, sans dépendance à strconv) ;
 * - autre : non pris en charge (objets, Either… : `toString` non modélisé).
 */
export const toInlineFunction: InlineFunction = (argument, site, context) => {
	const rendered = GoPrinter.renderNode(argument.goType);
	const stringType = GoAST.builtinTypeReferences.string;

	if (rendered === "string") {
		return callbackApplication({
			before: [],
			expression: argument.expression,
			goType: stringType,
		});
	}

	if (rendered === "float64") {
		const packageName = context.registerSharedDependency(inspectSharedDependency.value);

		return callbackApplication({
			before: [],
			expression: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: packageName,
					identifier: jsNumberToStringFunctionIdentifier,
				}),
				arguments: [argument.expression],
			}),
			goType: stringType,
		});
	}

	if (rendered === "bool") {
		const result = context.generateIdentifier();
		const assign = (value: string) => GoAST.createBlockStatement({
			statements: [
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([result]),
					values: DCommon.cast([GoAST.createStringLiteral({ value })]),
				}),
			],
		});

		return callbackApplication({
			before: [
				GoAST.createVariableDeclarationZeroValue({
					identifier: result,
					typeReference: stringType,
				}),
				GoAST.createIfStatement({
					condition: argument.expression,
					body: assign("true"),
					elseBranch: assign("false"),
				}),
			],
			expression: result,
			goType: stringType,
		});
	}

	return context.error(site, {
		reason: "duplojs-string-to-unsupported-type",
		goType: rendered,
	});
};

export async function toExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return createInlineFunctionValue(node, toInlineFunction, context);
	}

	const [argument] = node.arguments;

	if (!argument || node.arguments.length !== 1 || TsAST.isSpreadElement(argument)) {
		return context.error(node, "duplojs-string-to-single-argument-only");
	}

	const expression = DEither.unwrapRight(await context.transform(argument, expressionTransformers.value));

	if (DEither.isLeft(expression)) {
		return expression;
	}

	const goType = DEither.unwrapRight(await goTypeOfExpression(argument, context));

	if (DEither.isLeft(goType)) {
		return goType;
	}

	const application = DEither.unwrapRight(
		await toInlineFunction({
			expression: expression.result,
			goType: goType.result,
		}, node, context),
	);

	if (DEither.isLeft(application)) {
		return application;
	}

	return context.success({
		before: [...expression.before, ...application.before],
		result: application.expression,
	});
}
