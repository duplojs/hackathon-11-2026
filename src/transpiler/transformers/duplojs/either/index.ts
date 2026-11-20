import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DPattern from "@duplojs/lang/pattern";
import { type BuildContext } from "../../../context/build";
import { eitherConstructorExpressionHandler } from "./constructor";
import { eitherSuccessDependency, successFunctionIdentifier } from "./success/sharedDependency";
import { eitherFailDependency, failFunctionIdentifier } from "./fail/sharedDependency";
import { eitherLeftDependency, leftFunctionIdentifier } from "./left/sharedDependency";
import { matchInformationExpressionHandler } from "./matchInformation";
import { rightPipeExpressionHandler } from "./rightPipe";
import { isRightExpressionHandler } from "./isRight";
import { whenIsRightExpressionHandler, whenIsRightOtherwiseExpressionHandler } from "./whenIsRight";
import { eitherTypeHandler, resolveEitherTypeMember, type EitherTypeMember } from "./eitherType";

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
			// Constructeurs : même handler, seule la fonction Go change.
			DPattern.match(
				DCommon.equal("success"),
				() => eitherConstructorExpressionHandler(
					node,
					context,
					{
						functionIdentifier: successFunctionIdentifier,
						dependency: eitherSuccessDependency.value,
						argumentCount: 1,
					},
				),
			),
			DPattern.match(
				DCommon.equal("fail"),
				() => eitherConstructorExpressionHandler(
					node,
					context,
					{
						functionIdentifier: failFunctionIdentifier,
						dependency: eitherFailDependency.value,
						argumentCount: 0,
					},
				),
			),
			DPattern.match(
				DCommon.equal("left"),
				() => eitherConstructorExpressionHandler(
					node,
					context,
					{
						functionIdentifier: leftFunctionIdentifier,
						dependency: eitherLeftDependency.value,
						argumentCount: 2,
					},
				),
			),
			DPattern.match(
				DCommon.equal("matchInformation"),
				() => matchInformationExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(
				DCommon.equal("rightPipe"),
				() => rightPipeExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(
				DCommon.equal("isRight"),
				() => isRightExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(
				DCommon.equal("whenIsRightOtherwise"),
				() => whenIsRightOtherwiseExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(
				DCommon.equal("whenIsRight"),
				() => whenIsRightExpressionHandler(
					node,
					context,
				),
			),
			DPattern.otherwise(
				() => context.error(node, "either-function-not-supported-yet"),
			),
		);
	},
);

export const duploJSEitherTypeTransformer: Transformer<GoAST.GenericTypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTypeNode(node)) {
			return context.notSupport();
		}

		const resolvedMembers = await DCommon.asyncPipe(
			TsAST.isUnionTypeNode(node) ? node.types : [node],
			DArray.map((member) => resolveEitherTypeMember(member, context)),
			DCommon.promiseAll,
		);

		const members = DArray.filter(
			resolvedMembers,
			(member): member is EitherTypeMember => member !== undefined,
		);

		// Un seul membre qui n'est pas un Either (ex. `string | DEither.Fail`) : pas pour ce routeur.
		if (members.length !== resolvedMembers.length) {
			return context.notSupport();
		}

		return eitherTypeHandler(node, members, context);
	},
);
