import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as DObject from "@duplojs/lang/object";
import * as GO from "@go";
import * as TS from "typescript/ast";
import { TypeFlags } from "typescript/async";
import { createTransformer, type Transformer, type TransformationSuccessPayload } from "../../factory";
import { blockTransformer } from "../statement";
import { typeTransformers } from "../type";

interface TransformedParameters {
	parameters: readonly GO.AST.FunctionParameter[];
	before: TransformationSuccessPayload<GO.AST.FunctionDeclaration>["before"];
	topLevelDeclarations: GO.AST.TopLevelDeclaration[];
}

export const functionDeclarationTransformer: Transformer<GO.AST.FunctionDeclaration> = createTransformer(
	async(node, context, localContext) => {
		if (!(
			TS.isFunctionDeclaration(node)
			&& DObject.discriminate(node, "name", DCommon.truthy)
			&& DObject.discriminate(node, "body", DCommon.truthy)
			&& DObject.discriminate(node, "asteriskToken", DCommon.isType("undefined"))
			&& DObject.discriminate(node, "typeParameters", DCommon.isType("undefined"))
			&& DObject.discriminate(node, "modifiers", DCommon.isType("undefined"))
			&& DObject.discriminate(
				node,
				"parameters",
				(parameters): parameters is TS.NodeArray<
					TS.ParameterDeclaration & { name: TS.Identifier }
				> => DArray.every(
					parameters,
					(parameter) => (
						DObject.discriminate(parameter, "name", TS.isIdentifier)
						&& DObject.discriminate(parameter, "dotDotDotToken", DCommon.isType("undefined"))
						&& DObject.discriminate(parameter, "questionToken", DCommon.isType("undefined"))
						&& DObject.discriminate(parameter, "initializer", DCommon.isType("undefined"))
						&& DObject.discriminate(parameter, "modifiers", DCommon.isType("undefined"))
					),
				),
			)
		)) {
			return context.notSupport(node);
		}

		const identifier = GO.AST.createIdentifier(node.name.text);

		const parameters = await DCommon.asyncPipe(
			node.parameters,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<TransformedParameters>({
					parameters: [],
					before: [],
					topLevelDeclarations: [],
				}),
				async({ item: parameter, lastValue, next, exit }) => {
					const typeNode = parameter.type ?? await context.checker.typeToTypeNode(
						await context.checker.getTypeAtLocation(parameter),
						parameter,
					);
					if (!typeNode) {
						return exit(context.error({
							reason: "unsupported-function-parameter-type",
							node: parameter,
						}));
					}

					const type = await DCommon.asyncPipe(
						context.transform(typeNode, typeTransformers, localContext),
						DEither.keepAsRightByInformation("transformation-success"),
						DEither.unwrapRight,
					);
					if (DEither.isLeft(type)) {
						return exit(type);
					}

					return next({
						parameters: [
							...lastValue.parameters,
							[GO.AST.createIdentifier(parameter.name.text), type.result],
						],
						before: [...lastValue.before, ...type.before],
						topLevelDeclarations: [...lastValue.topLevelDeclarations, ...type.topLevelDeclarations],
					});
				},
			),
		);
		if (DEither.isLeft(parameters)) {
			return parameters;
		}

		const signature = await context.checker.getSignatureFromDeclaration(node);
		const returnType = await context.checker.getReturnTypeOfSignature(signature);
		const returnTypeNode = returnType.flags === TypeFlags.Void
			? undefined
			: node.type ?? await context.checker.typeToTypeNode(returnType, node);
		if (returnType.flags !== TypeFlags.Void && !returnTypeNode) {
			return context.error({
				reason: "unsupported-function-return-type",
				node,
			});
		}

		const returnTypePayload = returnTypeNode
			? await DCommon.asyncPipe(
				context.transform(returnTypeNode, typeTransformers, localContext),
				DEither.keepAsRightByInformation("transformation-success"),
				DEither.unwrapRight,
			)
			: {
				result: undefined,
				before: [],
				topLevelDeclarations: [],
			};
		if (DEither.isLeft(returnTypePayload)) {
			return returnTypePayload;
		}

		const body = await DCommon.asyncPipe(
			context.transform(node.body, [blockTransformer], localContext),
			DEither.keepAsRightByInformation("transformation-success"),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(body)) {
			return body;
		}

		return context.success({
			result: GO.AST.functionDeclaration({
				identifier,
				generic: [],
				parameters: parameters.parameters,
				returnTypes: returnTypePayload.result ? [returnTypePayload.result] : [],
				body: body.result,
			}),
			before: [...parameters.before, ...returnTypePayload.before, ...body.before],
			topLevelDeclarations: [
				...parameters.topLevelDeclarations,
				...returnTypePayload.topLevelDeclarations,
				...body.topLevelDeclarations,
			],
		});
	},
);
