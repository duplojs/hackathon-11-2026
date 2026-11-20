import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const eitherTypeIdentifier = GoAST.createIdentifier("Either");
export const eitherIsRightFunctionIdentifier = GoAST.createIdentifier("EitherIsRight");
export const isRightMethodIdentifier = GoAST.createIdentifier("IsRight");
export const getInformationMethodIdentifier = GoAST.createIdentifier("GetInformation");
export const getValueMethodIdentifier = GoAST.createIdentifier("GetValue");

/**
 * Union de variantes Either (`Success<T> | Fail | Left<...>`).
 * Chaque variante est un type Go concret qui implémente cette interface :
 * un `return` d'une variante est converti implicitement par Go vers l'union.
 *
 * ```go
 * type Either interface {
 *     IsRight() bool
 *     GetInformation() string
 *     GetValue() any
 * }
 * ```
 */
export const eitherDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: eitherTypeIdentifier,
				type: GoAST.createInterfaceType({
					elements: [
						GoAST.createInterfaceMethod({
							identifier: isRightMethodIdentifier,
							arguments: [],
							returnTypes: [GoAST.builtinTypeReferences.bool],
						}),
						GoAST.createInterfaceMethod({
							identifier: getInformationMethodIdentifier,
							arguments: [],
							returnTypes: [GoAST.builtinTypeReferences.string],
						}),
						GoAST.createInterfaceMethod({
							identifier: getValueMethodIdentifier,
							arguments: [],
							returnTypes: [GoAST.builtinTypeReferences.any],
						}),
					],
				}),
			}),
			GoAST.createFunctionDeclaration({
				identifier: eitherIsRightFunctionIdentifier,
				generic: [],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: GoAST.createIdentifier("either"),
						type: eitherTypeIdentifier,
					}),
				],
				returnTypes: [GoAST.builtinTypeReferences.bool],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: GoAST.createIdentifier("either"),
										identifier: isRightMethodIdentifier,
									}),
									arguments: [],
								}),
							],
						}),
					],
				}),
			}),
		],
	}),
);

/**
 * Méthodes qui font implémenter `Either` à une variante :
 * ```go
 * func (variant V) IsRight() bool          { return <isRight> }
 * func (variant V) GetInformation() string { return variant.Information }
 * func (variant V) GetValue() any          { return variant.Value }
 * ```
 */
export function createEitherMethods(
	receiverType: GoAST.MethodReceiverType,
	isRight: boolean,
) {
	const receiver = GoAST.createIdentifier("variant");

	const createMethod = (
		identifier: GoAST.Identifier,
		returnType: GoAST.Identifier,
		value: GoAST.Expression,
	) => GoAST.createMethodDeclaration({
		identifier,
		receiver: [receiver, receiverType],
		generic: [],
		arguments: [],
		returnTypes: [returnType],
		body: GoAST.createBlockStatement({
			statements: [GoAST.createReturnStatement({ values: [value] })],
		}),
	});

	return [
		createMethod(
			isRightMethodIdentifier,
			GoAST.builtinTypeReferences.bool,
			GoAST.createBooleanLiteral({ value: isRight }),
		),
		createMethod(
			getInformationMethodIdentifier,
			GoAST.builtinTypeReferences.string,
			GoAST.createSelectorExpression({
				target: receiver,
				identifier: GoAST.createIdentifier("Information"),
			}),
		),
		createMethod(
			getValueMethodIdentifier,
			GoAST.builtinTypeReferences.any,
			GoAST.createSelectorExpression({
				target: receiver,
				identifier: GoAST.createIdentifier("Value"),
			}),
		),
	] as const;
}
