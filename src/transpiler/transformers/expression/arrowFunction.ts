import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { expressionTransformers } from ".";
import { transformCheckerType } from "../type/fromChecker";
import { blockStatementTransformer } from "../statement/block";

/**
 * `(value) => expression` → `func(value T) R { return expression }`.
 * `(value) => { ... }` → `func(value T) R { ... }`.
 * Les types des paramètres et du retour viennent du checker : dans
 * `matchInformation(x, { success: (value) => … })`, TypeScript les déduit du contexte
 * alors que le source ne les écrit pas.
 * Limites : paramètres simples uniquement (pas de déstructuration), pas d'`async`.
 */
export const arrowFunctionTransformer: Transformer<GoAST.FunctionLiteral> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrowFunction(node)) {
			return context.notSupport();
		}

		const { typeChecker } = context.transpilation;

		const functionArguments: GoAST.FunctionArgument[] = [];
		const preambleStatements: GoAST.Statement[] = [];

		for (const parameter of node.parameters) {
			if (TsAST.isObjectBindingPattern(parameter.name)) {
				const paramIdent = context.generateIdentifier();
				const structFields: GoAST.StructMember[] = [];

				for (const elem of parameter.name.elements) {
					if (elem && TsAST.isBindingElement(elem) && elem.name && TsAST.isIdentifier(elem.name)) {
						const propName = elem.propertyName && TsAST.isIdentifier(elem.propertyName)
							? elem.propertyName.text
							: elem.name.text;
						const goFieldName = propName.charAt(0).toUpperCase() + propName.slice(1);
						let fieldType: GoAST.StructFieldType = GoAST.builtinTypeReferences.float64;
						if (propName === "index") {
							fieldType = GoAST.builtinTypeReferences.float64;
						} else {
							const elemType = await typeChecker.getTypeAtLocation(elem);
							const transformedElem = await DCommon.asyncPipe(
								transformCheckerType(elemType, elem, context),
								DEither.unwrapRight,
							);
							if (!DEither.isLeft(transformedElem)) {
								fieldType = transformedElem.result;
							}
						}
						structFields.push(
							GoAST.createStructField({
								identifier: GoAST.createIdentifier(goFieldName),
								typeReference: fieldType,
							}),
						);

						preambleStatements.push(
							GoAST.createShortVariableDeclarationStatement({
								identifier: context.createSourceIdentifier(elem.name.text),
								initializer: GoAST.createSelectorExpression({
									target: paramIdent,
									identifier: GoAST.createIdentifier(goFieldName),
								}),
							}),
						);
					}
				}

				functionArguments.push(GoAST.createFunctionArgument({
					identifier: paramIdent,
					type: GoAST.createStructType({ fields: structFields }),
				}));
				continue;
			}

			const parameterType = await DCommon.asyncPipe(
				transformCheckerType(await typeChecker.getTypeAtLocation(parameter), parameter, context),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(parameterType)) {
				return parameterType;
			}

			if (TsAST.isIdentifier(parameter.name)) {
				functionArguments.push(GoAST.createFunctionArgument({
					identifier: context.createSourceIdentifier(parameter.name.text),
					type: parameterType.result,
				}));
			} else if (TsAST.isArrayBindingPattern(parameter.name)) {
				const paramIdent = context.generateIdentifier();
				functionArguments.push(GoAST.createFunctionArgument({
					identifier: paramIdent,
					type: parameterType.result,
				}));

				const paramTypeAtLoc = await typeChecker.getTypeAtLocation(parameter);
				const paramTypeNode = await typeChecker.typeToTypeNode(paramTypeAtLoc, parameter);
				const isTuple = paramTypeNode ? TsAST.isTupleTypeNode(paramTypeNode) : false;

				for (let idx = 0; idx < parameter.name.elements.length; idx++) {
					const elem = parameter.name.elements[idx];
					if (elem && TsAST.isBindingElement(elem) && elem.name && TsAST.isIdentifier(elem.name)) {
						const initializer = isTuple
							? GoAST.createSelectorExpression({
								target: paramIdent,
								identifier: GoAST.createIdentifier(`V${idx}`),
							})
							: GoAST.createIndexExpression({
								target: paramIdent,
								index: GoAST.createIntegerLiteral({ value: BigInt(idx) }),
							});

						preambleStatements.push(
							GoAST.createShortVariableDeclarationStatement({
								identifier: context.createSourceIdentifier(elem.name.text),
								initializer,
							}),
						);
					}
				}
			} else {
				return context.error(parameter, "arrow-function-parameter-unsupported-binding");
			}
		}

		const signature = await typeChecker.getSignatureFromDeclaration(node);
		if (!signature) {
			return context.error(node, "arrow-function-missing-signature");
		}
		const returnType = await DCommon.asyncPipe(
			transformCheckerType(await typeChecker.getReturnTypeOfSignature(signature), node, context),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(returnType)) {
			return returnType;
		}

		let retType = returnType.result;
		if (DModeling.hasTagValue(retType, "[node][type]array")) {
			const arr = retType as GoAST.ArrayType;
			if (DModeling.hasTagValue(arr.length, "[node][expression]literal-integer") && (arr.length as GoAST.IntegerLiteral).value === 1n) {
				retType = GoAST.createSliceType({ elementType: arr.elementType });
			}
		}

		const createFunctionLiteral = (body: GoAST.BlockStatement) => context.success({
			result: GoAST.createFunctionLiteral({
				arguments: functionArguments,
				returnTypes: [retType],
				body: GoAST.createBlockStatement({
					statements: [...preambleStatements, ...body.statements],
				}),
			}),
		});

		if (TsAST.isBlock(node.body)) {
			const block = await DCommon.asyncPipe(
				context.transform(node.body, [blockStatementTransformer]),
				DEither.unwrapRight,
			);

			return DEither.isLeft(block) ? block : createFunctionLiteral(block.result);
		}

		// Corps expression : ses `before` restent dans la fonction, avant le `return`.
		const expression = await DCommon.asyncPipe(
			context.transform(node.body, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(expression)) {
			return expression;
		}

		return createFunctionLiteral(GoAST.createBlockStatement({
			statements: DArray.concat(
				expression.before,
				[GoAST.createReturnStatement({ values: [expression.result] })],
			),
		}));
	},
);
