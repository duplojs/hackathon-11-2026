import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { evaluateAllToVariables } from "../../../expression/evaluate";

interface PipeSteps {
	readonly statements: readonly GoAST.Statement[];
	readonly current: GoAST.Expression;
}

// `pipe(input, f1, f2…)` : l'entrée et les fonctions sont évaluées dans l'ordre des arguments,
// puis chaque fonction reçoit le résultat de la précédente. Chaque résultat intermédiaire est
// stocké, ce qui conserve l'ordre des étapes sans imbriquer les appels.
export async function pipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "pipe-reference-without-call-not-supported");
	}

	if (node.arguments.length < 2) {
		return context.error(node, "pipe-expects-input-and-functions");
	}

	const evaluated = await evaluateAllToVariables(node.arguments, context);

	if (DEither.isLeft(evaluated)) {
		return evaluated;
	}

	const { before, identifiers } = DEither.unwrapRight(evaluated);
	const [input, ...functions] = identifiers;
	const lastFunction = functions[functions.length - 1];

	if (!input || !lastFunction) {
		return context.error(node, "pipe-expects-input-and-functions");
	}

	// Toutes les étapes sauf la dernière, dont l'appel est le résultat de l'expression :
	// chaque résultat intermédiaire est stocké et transmis à l'étape suivante.
	const { statements: steps, current } = DArray.reduce(
		DArray.slice(functions, 0, -1),
		DArray.reduceFrom<PipeSteps>({
			statements: [],
			current: input,
		}),
		({ element, lastValue, next }) => {
			const step = GoAST.createShortVariableDeclarationStatement({
				identifier: context.generateIdentifier("pipeStep"),
				initializer: GoAST.createCallExpression({
					callee: element,
					arguments: [lastValue.current],
				}),
			});

			return next({
				statements: DArray.push(lastValue.statements, step),
				current: step.identifier,
			});
		},
	);

	return context.success({
		before: DArray.concat(before, steps),
		result: GoAST.createCallExpression({
			callee: lastFunction,
			arguments: [current],
		}),
	});
}
