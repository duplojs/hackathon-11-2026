import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TypeFlags } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../context/build";
import { blockStatementTransformer } from "../statement/block";
import { convertToCheckerType, transformCheckerType } from "../type";
import { expressionTransformers } from ".";

interface TranslatedParameter {
	readonly argument: GoAST.FunctionArgument;
	// Liaisons produites par une déconstruction, placées en tête du corps de la fonction.
	readonly bindings: readonly GoAST.Statement[];
}

// Go n'a pas de déconstruction dans les paramètres : le tuple est reçu entier sous un nom
// généré, puis chaque nom est lié à sa position (`one := tuple[0]`) au début du corps.
function translateArrayBinding(
	pattern: TsAST.ArrayBindingPattern,
	source: GoAST.Identifier,
	context: BuildContext,
) {
	const bindings = DArray.reduce(
		pattern.elements,
		DArray.reduceFrom<readonly GoAST.Statement[]>([]),
		({ element, index, lastValue, next, exit }) => {
			// Un trou (`[one, , divisor]`) ne lie aucun nom : la position est simplement ignorée.
			if (TsAST.isOmittedExpression(element) || !element.name) {
				return next(lastValue);
			}

			if (
				!TsAST.isIdentifier(element.name)
				|| element.dotDotDotToken
				|| element.initializer
				|| element.propertyName
			) {
				return exit(context.error(element, "binding-element-not-supported"));
			}

			return next(
				DArray.push(
					lastValue,
					GoAST.createShortVariableDeclarationStatement({
						identifier: context.createSourceIdentifier(element.name.text),
						initializer: GoAST.createIndexExpression({
							target: source,
							index: GoAST.createIntegerLiteral({ value: BigInt(index) }),
						}),
					}),
				),
			);
		},
	);

	return DEither.isLeft(bindings)
		? bindings
		: DEither.success(bindings);
}

async function translateParameter(
	parameter: TsAST.ParameterDeclaration,
	context: BuildContext,
) {
	if (parameter.dotDotDotToken || parameter.initializer || parameter.questionToken) {
		return context.error(parameter, "parameter-form-not-supported");
	}

	const type = await transformCheckerType(
		await context.transpilation.typeChecker.getTypeAtLocation(parameter),
		parameter,
		context,
	);

	if (DEither.isLeft(type)) {
		return type;
	}

	if (TsAST.isIdentifier(parameter.name)) {
		return DEither.success<TranslatedParameter>({
			argument: GoAST.createFunctionArgument({
				identifier: context.createSourceIdentifier(parameter.name.text),
				type: DEither.unwrapRight(type),
			}),
			bindings: [],
		});
	}

	if (!TsAST.isArrayBindingPattern(parameter.name)) {
		return context.error(parameter, "object-binding-parameter-not-supported");
	}

	const source = context.generateIdentifier("tupleParameter");
	const bindings = translateArrayBinding(parameter.name, source, context);

	if (DEither.isLeft(bindings)) {
		return bindings;
	}

	return DEither.success<TranslatedParameter>({
		argument: GoAST.createFunctionArgument({
			identifier: source,
			type: DEither.unwrapRight(type),
		}),
		bindings: DEither.unwrapRight(bindings),
	});
}

// Une fonction fléchée (ou une expression `function`) devient une fonction littérale Go.
// Ses types viennent du checker : un paramètre non annoté prend le type déduit du contexte
// (par exemple l'élément d'un tableau passé à `map`). Les variables extérieures utilisées dans
// le corps sont capturées par la fermeture Go, comme en JavaScript.
export const arrowFunctionTransformer: Transformer<GoAST.FunctionLiteral> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrowFunction(node) && !TsAST.isFunctionExpression(node)) {
			return context.notSupport();
		}

		if (node.asteriskToken || node.modifiers?.length) {
			return context.error(node, "function-modifier-not-supported");
		}

		const { typeChecker } = context.transpilation;

		const parameters = await DCommon.asyncPipe(
			node.parameters,
			DArray.map((parameter) => translateParameter(parameter, context)),
			DCommon.promiseAll,
			DArray.reduce(
				DArray.reduceFrom<readonly TranslatedParameter[]>([]),
				({ element, lastValue, next, exit }) => DEither.isLeft(element)
					? exit(element)
					: next(DArray.push(lastValue, DEither.unwrapRight(element))),
			),
		);

		if (DEither.isLeft(parameters)) {
			return parameters;
		}

		const returnType = await typeChecker.getReturnTypeOfSignature(
			await typeChecker.getSignatureFromDeclaration(node),
		);

		const isVoid = Boolean(returnType.flags & TypeFlags.Void);

		const returnGoType = isVoid
			? undefined
			: await transformCheckerType(returnType, node, context);

		if (returnGoType && DEither.isLeft(returnGoType)) {
			return returnGoType;
		}

		const body = await DCommon.justExec(async() => {
			if (TsAST.isBlock(node.body)) {
				const block = await DCommon.asyncPipe(
					context.transform(node.body, [blockStatementTransformer]),
					DEither.unwrapRight,
				);

				return DEither.isLeft(block)
					? block
					: DEither.success<readonly GoAST.Statement[]>(block.result.statements);
			}

			if (isVoid) {
				return context.error(node.body, "void-expression-body-not-supported");
			}

			const expression = await DCommon.asyncPipe(
				context.transform(node.body, expressionTransformers.value),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(expression)) {
				return expression;
			}

			// Corps expression : sa valeur est retournée dans la représentation du type de retour.
			const value = await convertToCheckerType({
				expression: expression.result,
				source: await typeChecker.getTypeAtLocation(node.body),
				target: returnType,
				location: node.body,
				context,
			});

			if (DEither.isLeft(value)) {
				return value;
			}

			return DEither.success<readonly GoAST.Statement[]>(
				DArray.push(
					expression.before,
					GoAST.createReturnStatement({ values: [DEither.unwrapRight(value)] }),
				),
			);
		});

		if (DEither.isLeft(body)) {
			return body;
		}

		return context.success({
			result: GoAST.createFunctionLiteral({
				arguments: DArray.map(parameters, ({ argument }) => argument),
				returnTypes: returnGoType ? [DEither.unwrapRight(returnGoType)] : [],
				body: GoAST.createBlockStatement({
					statements: DArray.concat(
						DArray.flatMap(parameters, ({ bindings }) => bindings),
						DEither.unwrapRight(body),
					),
				}),
			}),
		});
	},
);
