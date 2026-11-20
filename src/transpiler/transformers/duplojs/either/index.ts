import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DPattern from "@duplojs/lang/pattern";
import { successExpressionHandler, successTypeHandler } from "./success";
import { typeGuardExpressionHandler } from "./isRight";
import { failTypeHandler, failExpressionHandler } from "./fail";
import { leftExpressionHandler, leftTypeHandler } from "./left";
import { rightPipeExpressionHandler } from "./rightPipe";
import { groupExpressionHandler } from "./group";
import { whenIsRightOtherwiseExpressionHandler } from "./whenIsRightOtherwise";
import { whenIsRightExpressionHandler } from "./whenIsRight";
import { matchInformationExpressionHandler } from "./matchInformation";
import { rightExpressionHandler, rightTypeHandler } from "./right";
import { errorExpressionHandler, errorTypeHandler } from "./error";
import { unwrapRightExpressionHandler } from "./unwrapRight";

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
				DCommon.equal("unwrapRight"),
				() => unwrapRightExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("right"),
				() => rightExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("error"),
				() => errorExpressionHandler(node, context),
			),
			// `isLeft` et `isRight` sont des gardes de type : le même traitement lit leur prédicat.
			DPattern.match(
				DCommon.equal("isLeft"),
				() => typeGuardExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("isRight"),
				() => typeGuardExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(
				DCommon.equal("left"),
				() => leftExpressionHandler(node, context),
			),
			DPattern.match(
				(name) => name === "rightPipe" || name === "rightAsyncPipe",
				() => rightPipeExpressionHandler(node, context),
			),
			DPattern.match(
				(name) => name === "group" || name === "asyncGroup",
				() => groupExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("fail"),
				() => failExpressionHandler(node, context),
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
			DPattern.otherwise(
				() => context.error(node, "duplojs-either-function-not-supported"),
			),
		);
	},
);

export const duploJSEitherTypeTransformer: Transformer<
	| GoAST.GenericTypeReference
	| GoAST.PackageTypeReference
> = createTransformer(
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
				() => failTypeHandler(node, context),
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
