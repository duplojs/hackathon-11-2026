import { type SharedDependency, type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../context/build";
import { evaluateAllToVariables } from "../../expression/evaluate";
import { transformCheckerType, typeTransformers } from "../../type";
import { undefinedShardDependency, undefinedTypeIdentifier } from "../../../sharedDependency/defaults";

export interface EitherConstructor {
	dependency(): SharedDependency;
	readonly typeIdentifier: GoAST.Identifier;
	readonly functionIdentifier: GoAST.Identifier;
	// Le constructeur reçoit l'information en premier argument (`right`, `left`).
	readonly hasInformation: boolean;
}

// Valeur absente (`left("information")`) : `undefined`, comme le fait DuploJS.
export function createUndefinedValue(context: BuildContext): GoAST.Expression {
	return GoAST.createStructLiteral({
		typeReference: GoAST.createPackageTypeReference({
			packageName: context.registerSharedDependency(undefinedShardDependency.value),
			identifier: undefinedTypeIdentifier,
		}),
		elements: [],
	});
}

// Appel d'un constructeur Either (`right`, `left`, `error`) : les arguments sont évalués dans
// l'ordre, puis passés au constructeur Go instancié avec le type de valeur calculé par le checker.
export async function eitherConstructorExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
	constructor: EitherConstructor,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	// La fonction est générique : seule la forme appelée est traduite.
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "either-constructor-reference-without-call-not-supported");
	}

	const maxArguments = constructor.hasInformation ? 2 : 1;

	if (DArray.lengthEqual(node.arguments, 0) || node.arguments.length > maxArguments) {
		return context.error(node, "either-constructor-arguments-not-supported");
	}

	const evaluated = await evaluateAllToVariables(node.arguments, context);

	if (DEither.isLeft(evaluated)) {
		return evaluated;
	}

	const { before, identifiers } = DEither.unwrapRight(evaluated);

	// Sans valeur (`left("information")`), la valeur est `undefined`, comme dans DuploJS.
	const goArguments: readonly GoAST.Expression[] = DArray.lengthEqual(identifiers, maxArguments)
		? identifiers
		: DArray.push(identifiers, createUndefinedValue(context));

	const eitherType = await transformCheckerType(
		await context.transpilation.typeChecker.getTypeAtLocation(node),
		node,
		context,
	);

	if (DEither.isLeft(eitherType)) {
		return eitherType;
	}

	const typeReference = DEither.unwrapRight(eitherType);

	if (!DModeling.hasTagValue(typeReference, "[node]type-reference-generic")) {
		return context.error(node, "either-constructor-type-not-resolved");
	}

	return context.success({
		before,
		result: GoAST.createCallExpression({
			callee: GoAST.createInstantiationExpression({
				target: GoAST.createSelectorExpression({
					target: context.registerSharedDependency(constructor.dependency()),
					identifier: constructor.functionIdentifier,
				}),
				typeArguments: typeReference.typeArguments,
			}),
			arguments: goArguments,
		}),
	});
}

// Type d'une variante Either : seul le type de la valeur paramètre la struct Go.
// `valueIndex` est la position de la valeur dans les arguments de type (`Right<Info, V>` : 1, `Error<V>` : 0).
export async function eitherConstructorTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
	constructor: EitherConstructor,
	valueIndex: number,
) {
	const valueNode = node.typeArguments?.[valueIndex];

	const value = valueNode
		? await DCommon.asyncPipe(
			context.transform(valueNode, typeTransformers.value),
			DEither.unwrapRight,
		)
		: undefined;

	if (value && DEither.isLeft(value)) {
		return value;
	}

	const valueType = value?.result ?? GoAST.createPackageTypeReference({
		packageName: context.registerSharedDependency(undefinedShardDependency.value),
		identifier: undefinedTypeIdentifier,
	});

	return context.success({
		before: value?.before ?? [],
		result: GoAST.createGenericTypeReference({
			typeReference: GoAST.createPackageTypeReference({
				packageName: context.registerSharedDependency(constructor.dependency()),
				identifier: constructor.typeIdentifier,
			}),
			typeArguments: DCommon.cast([valueType]),
		}),
	});
}
