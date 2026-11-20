import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";

type InstantiationParams = Parameters<typeof GoAST.createInstantiationExpression>[0];
type GenericTypeParams = Parameters<typeof GoAST.createGenericTypeReference>[0];
type StructLiteralParams = Parameters<typeof GoAST.createStructLiteral>[0];
import { type GoType } from "./goTypeOf";

/**
 * Aides de construction d'AST Go pour le runtime généré (unions étiquetées,
 * conversions d'Either). Elles ne font qu'appeler les fabriques de GoAST.
 */
export const goBuilder = {
	identifier: (name: string) => GoAST.createIdentifier(name),
	select: (target: GoAST.Expression, field: GoAST.Identifier) => GoAST.createSelectorExpression({
		target,
		identifier: field,
	}),
	call: (callee: GoAST.Expression, args: readonly GoAST.Expression[]) => GoAST.createCallExpression({
		callee,
		arguments: args,
	}),
	instantiate: (target: GoAST.Expression, typeArguments: readonly GoType[]) => (
		typeArguments.length === 0
			? target
			: GoAST.createInstantiationExpression({
				target: target as InstantiationParams["target"],
				typeArguments: typeArguments as InstantiationParams["typeArguments"],
			})
	),
	genericType: (
		typeReference: GoAST.Identifier | GoAST.TypeReference,
		typeArguments: readonly GoType[],
	) => GoAST.createGenericTypeReference({
		typeReference: typeReference as GenericTypeParams["typeReference"],
		typeArguments: typeArguments as GenericTypeParams["typeArguments"],
	}),
	argument: (identifier: GoAST.Identifier, type: GoType) => GoAST.createFunctionArgument({
		identifier,
		type: DCommon.cast(type),
	}),
	typeParameter: (identifier: GoAST.Identifier) => GoAST.createTypeParameter({
		identifier,
		constraint: GoAST.builtinTypeReferences.any,
	}),
	block: (statements: readonly GoAST.Statement[]) => GoAST.createBlockStatement({ statements }),
	return: (...values: readonly GoAST.Expression[]) => GoAST.createReturnStatement({ values }),
	if: (
		condition: GoAST.Expression,
		statements: readonly GoAST.Statement[],
		elseStatements?: readonly GoAST.Statement[],
	) => GoAST.createIfStatement({
		condition,
		body: GoAST.createBlockStatement({ statements }),
		elseBranch: elseStatements && GoAST.createBlockStatement({ statements: elseStatements }),
	}),
	equal: (left: GoAST.Expression, right: GoAST.Expression) => GoAST.createBinaryExpression({
		operator: "==",
		left,
		right,
	}),
	integer: (value: number) => GoAST.createIntegerLiteral({ value: BigInt(value) }),
	struct: (
		typeReference: GoType,
		fields: readonly (readonly [GoAST.Identifier, GoAST.Expression])[],
	) => GoAST.createStructLiteral({
		typeReference: typeReference as StructLiteralParams["typeReference"],
		elements: fields.map(([key, value]) => GoAST.createKeyedElement({
			key,
			value,
		})),
	}),
	zeroValueReturn: (type: GoType) => {
		const zero = GoAST.createIdentifier("zero");

		return [
			GoAST.createVariableDeclarationZeroValue({
				identifier: zero,
				typeReference: DCommon.cast(type),
			}),
			GoAST.createReturnStatement({ values: [zero] }),
		] as const;
	},
	functionLiteral: (
		args: readonly GoAST.FunctionArgument[],
		returnType: GoType,
		statements: readonly GoAST.Statement[],
	) => GoAST.createFunctionLiteral({
		arguments: args,
		returnTypes: [DCommon.cast(returnType)],
		body: GoAST.createBlockStatement({ statements }),
	}),
	functionType: (parameterTypes: readonly GoType[], returnType: GoType) => GoAST.createFunctionType({
		arguments: parameterTypes.map((type, index) => GoAST.createFunctionArgument({
			identifier: GoAST.createIdentifier(`p${index}`),
			type: DCommon.cast(type),
		})),
		returnTypes: [DCommon.cast(returnType)],
	}),
};
