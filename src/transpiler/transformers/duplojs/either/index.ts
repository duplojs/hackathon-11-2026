import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DPattern from "@duplojs/lang/pattern";
import { successExpressionHandler, successTypeHandler } from "./success";
import { isRightExpressionHandler } from "./isRight";
import { isLeftExpressionHandler } from "./isLeft";
import { groupExpressionHandler } from "./group";
import { failExpressionHandler, failTypeHandler } from "./fail";
import { leftExpressionHandler, leftTypeHandler } from "./left";
import { rightExpressionHandler, rightTypeHandler } from "./right";
import { errorExpressionHandler, errorTypeHandler } from "./error";
import { matchInformationExpressionHandler } from "./matchInformation";
import { whenIsRightExpressionHandler } from "./whenIsRight";
import { whenIsRightOtherwiseExpressionHandler } from "./whenIsRightOtherwise";
import { rightPipeExpressionHandler } from "./rightPipe";
import { unionTypeHandler } from "./union";
import * as DArray from "@duplojs/lang/array";

export const duploJSEitherDeclarationTransformer: Transformer<GoAST.Declaration> = createTransformer(
	(_node, context) => context.notSupport(),
);

export const duploJSEitherExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
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
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/either\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("success"),
				() => successExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(
				DCommon.equal("fail"),
				() => failExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("left"),
				() => leftExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("right"),
				() => rightExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("error"),
				() => errorExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("matchInformation"),
				() => matchInformationExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("whenIsRight"),
				() => whenIsRightExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("whenIsRightOtherwise"),
				() => whenIsRightOtherwiseExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("rightPipe"),
				() => rightPipeExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("rightAsyncPipe"),
				() => rightPipeExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("isRight"),
				() => isRightExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("isLeft"),
				() => isLeftExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("group"),
				() => groupExpressionHandler(node, context, false),
			),
			DPattern.match(
				DCommon.equal("asyncGroup"),
				() => groupExpressionHandler(node, context, true),
			),
			DPattern.otherwise(
				() => context.error(node),
			),
		);
	},
);

type EitherTypeTransformerResult = GoAST.GenericTypeReference | GoAST.PackageTypeReference;
export const duploJSEitherTypeTransformer: Transformer<EitherTypeTransformerResult> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTypeReferenceNode(node) && !TsAST.isImportTypeNode(node)) {
			return context.notSupport();
		}

		const reference = TsAST.isTypeReferenceNode(node) ? node.typeName : node;

		const moduleReference = await DCommon.asyncPipe(
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/either\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("Success"),
				() => successTypeHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("Fail"),
				() => failTypeHandler(context),
			),
			DPattern.match(
				DCommon.equal("Left"),
				() => leftTypeHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("Right"),
				() => rightTypeHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("Error"),
				() => errorTypeHandler(node, context),
			),
			DPattern.otherwise(
				() => context.notSupport(),
			),
		);
	},
);

/**
 * Routeur des unions : `A | B | ...` dont **tous** les membres sont des types
 * du domaine Either. Une union mêlant d'autres types n'est pas prise en charge ici.
 */
export const duploJSEitherUnionTypeTransformer: Transformer<GoAST.PackageTypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isUnionTypeNode(node)) {
			return context.notSupport();
		}

		const memberReferences = await DCommon.asyncPipe(
			node.types,
			DArray.map(
				(member) => {
					if (TsAST.isTypeReferenceNode(member)) {
						return context.resolveReferenceModule(member.typeName, "@duplojs/lang", /^dist\/either\//);
					}

					if (TsAST.isImportTypeNode(member)) {
						return context.resolveReferenceModule(member, "@duplojs/lang", /^dist\/either\//);
					}

					return DEither.none();
				},
			),
			DCommon.promiseAll,
		);

		if (!DArray.every(memberReferences, DEither.isRight)) {
			return context.notSupport();
		}

		return unionTypeHandler(context);
	},
);
