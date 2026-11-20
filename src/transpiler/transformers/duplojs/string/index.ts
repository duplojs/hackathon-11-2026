import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { createTransformer, type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../context/build";
import { expressionTransformers } from "../../expression";
import { printDependency } from "../common/print/sharedDependency";
import { stringToDependency, stringToFunctionIdentifier } from "./sharedDependency";

/**
 * `DString.to` passée par son nom (à map, whenIsRightOtherwise…) : on renvoie la
 * fonction Go, que `inlineCallback` appelle directement (`StringTo(valeur)`).
 * Appel direct `DString.to(x)` : `StringTo(x)`.
 */
async function stringToExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	// StringTo utilise formatNumber, défini dans print.go.
	context.registerSharedDependency(printDependency.value);

	const callee = GoAST.createSelectorExpression({
		target: context.registerSharedDependency(stringToDependency.value),
		identifier: stringToFunctionIdentifier,
	});

	// Passée par son nom : la fonction Go elle-même.
	if (!TsAST.isCallExpression(node)) {
		return context.success({ result: callee });
	}

	// Appel direct `DString.to(x)` : l'argument passe par une variable (ordre d'évaluation),
	// puis appel direct de StringTo (fonction générique : Go déduit T de l'argument).
	const argumentNode = DArray.first(node.arguments);

	if (!argumentNode || node.arguments.length !== 1) {
		return context.error(node, "string-to-expects-one-argument");
	}

	const argument = await DCommon.asyncPipe(
		context.transform(argumentNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	const statement = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: argument.result,
	});

	return context.success({
		before: [...argument.before, statement],
		result: GoAST.createCallExpression({
			callee,
			arguments: [statement.identifier],
		}),
	});
}

/** Routeur des fonctions de `@duplojs/lang/string`. */
export const duploJSStringExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		const reference = TsAST.isCallExpression(node)
			? node.expression
			: node;

		if (
			!TsAST.isIdentifier(reference)
			&& !TsAST.isPropertyAccessExpression(reference)
		) {
			return context.notSupport();
		}

		const moduleReference = await DCommon.asyncPipe(
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/string\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("to"),
				() => stringToExpressionHandler(node, context),
			),
			DPattern.otherwise(
				() => context.error(node, "string-function-not-supported-yet"),
			),
		);
	},
);
