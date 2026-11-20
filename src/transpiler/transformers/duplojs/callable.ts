import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind, type Type } from "typescript/async";
import type { BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";
import { arrayCoalescingDependency, arrayCoalescingFunctionIdentifier } from "./array/coalescing/sharedDependency";
import { numberToStringDependency, numberToStringFunctionIdentifier } from "./string/to/sharedDependency";
import { eitherSuccessDependency, successFunctionIdentifier } from "./either/success/sharedDependency";

export interface CallableInvocation {
	readonly before: readonly GoAST.Statement[];
	readonly result: GoAST.Expression;
}

/**
 * Normalise l'appel d'un callable TypeScript (fonction point-free, référence locale,
 * arrow function) en une expression Go optimisée.
 */
export async function invokeCallable(
	callableNode: TsAST.Node,
	argumentExpr: GoAST.Expression | undefined,
	context: BuildContext,
	inputType?: Type,
): Promise<DEither.Success<CallableInvocation> | DEither.Left<string, unknown>> {
	const { typeChecker } = context.transpilation;

	// Détection des intrinsèques point-free connues via résolution de module sémantique
	if (TsAST.isPropertyAccessExpression(callableNode) || TsAST.isIdentifier(callableNode)) {
		const modRef = await DCommon.asyncPipe(
			context.resolveReferenceModule(callableNode, "@duplojs/lang"),
			DEither.unwrapRight,
		);

		if (!DEither.isLeft(modRef)) {
			const { exportName, entry } = modRef;

			if (exportName === "coalescing" && entry.startsWith("dist/array/")) {
				if (inputType && argumentExpr) {
					const inputTypeRecord = inputType as unknown as {
						aliasSymbol?: { name?: string };
						symbol?: { name?: string };
					};
					const symbol = inputTypeRecord.aliasSymbol ?? inputTypeRecord.symbol;
					const symbolName = symbol?.name;
					const isArray = (symbolName === "Array" || symbolName === "ReadonlyArray")
						|| (await typeChecker.isArrayType(inputType))
						|| (await typeChecker.isTupleType(inputType));
					if (isArray) {
						return DEither.success({
							before: [],
							result: argumentExpr,
						});
					}
				}
				const target = context.registerSharedDependency(arrayCoalescingDependency.value);
				return DEither.success({
					before: [],
					result: GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target,
							identifier: arrayCoalescingFunctionIdentifier,
						}),
						arguments: argumentExpr ? [argumentExpr] : [],
					}),
				});
			}

			if (exportName === "to" && entry.startsWith("dist/string/")) {
				const target = context.registerSharedDependency(numberToStringDependency.value);
				return DEither.success({
					before: [],
					result: GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target,
							identifier: numberToStringFunctionIdentifier,
						}),
						arguments: argumentExpr ? [argumentExpr] : [],
					}),
				});
			}

			if (exportName === "length" && entry.startsWith("dist/string/")) {
				context.file.imports.add(GoAST.createImportDeclaration({ path: "unicode/utf8" }));
				return DEither.success({
					before: [],
					result: GoAST.createCallExpression({
						callee: GoAST.builtinTypeReferences.float64,
						arguments: [
							GoAST.createCallExpression({
								callee: GoAST.createSelectorExpression({
									target: GoAST.createIdentifier("utf8"),
									identifier: GoAST.createIdentifier("RuneCountInString"),
								}),
								arguments: argumentExpr ? [argumentExpr] : [],
							}),
						],
					}),
				});
			}

			if (exportName === "success" && entry.startsWith("dist/either/")) {
				const target = context.registerSharedDependency(eitherSuccessDependency.value);
				return DEither.success({
					before: [],
					result: GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target,
							identifier: successFunctionIdentifier,
						}),
						arguments: argumentExpr ? [argumentExpr] : [],
					}),
				});
			}
		}
	}

	// Référence locale directe (identifiant de fonction au niveau module / importé)
	if (TsAST.isIdentifier(callableNode)) {
		const symbol = await typeChecker.getSymbolAtLocation(callableNode);
		if (symbol) {
			const resolved = symbol.flags & 0x1000000 /* Alias */
				? await typeChecker.getAliasedSymbol(symbol)
				: symbol;

			// Si c'est une fonction importée d'un autre fichier du projet
			const decl = resolved.valueDeclaration as TsAST.Declaration | undefined;
			if (decl && TsAST.isFunctionDeclaration(decl) && decl.name) {
				const depFile = await DCommon.asyncPipe(
					context.resolveDependencyFile(callableNode),
					DEither.unwrapRight,
				);

				let calleeExpr: GoAST.Expression = GoAST.createIdentifier(decl.name.text);
				if (!DEither.isLeft(depFile)) {
					const pkgIdent = context.registerDependencyFile(depFile);
					calleeExpr = GoAST.createSelectorExpression({
						target: pkgIdent,
						identifier: GoAST.createIdentifier(
							decl.name.text.charAt(0).toUpperCase() + decl.name.text.slice(1),
						),
					});
				}

				return DEither.success({
					before: [],
					result: GoAST.createCallExpression({
						callee: calleeExpr,
						arguments: argumentExpr ? [argumentExpr] : [],
					}),
				});
			}
		}
	}

	// Transformer standard pour ArrowFunction ou expression quelconque
	const transformed = await DCommon.asyncPipe(
		context.transform(callableNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(transformed)) {
		return transformed;
	}

	return DEither.success({
		before: transformed.before ?? [],
		result: GoAST.createCallExpression({
			callee: transformed.result,
			arguments: argumentExpr ? [argumentExpr] : [],
		}),
	});
}

import { typeTransformers } from "../type";

export async function getEitherRightValueType(
	eitherType: Type,
	location: TsAST.Node,
	context: BuildContext,
): Promise<GoAST.Type | GoAST.TypeReference | undefined> {
	const { typeChecker } = context.transpilation;

	const sigs = await typeChecker.getSignaturesOfType(eitherType, SignatureKind.Call);
	const [firstSig] = sigs ?? [];
	if (firstSig) {
		const retType = await typeChecker.getReturnTypeOfSignature(firstSig);
		return getEitherRightValueType(retType, location, context);
	}

	const typeNode = await typeChecker.typeToTypeNode(eitherType, location);
	if (!typeNode) {
		return undefined;
	}

	const members = TsAST.isUnionTypeNode(typeNode) ? [...typeNode.types] : [typeNode];

	let memberIndex = 0;
	while (memberIndex < members.length) {
		const memberNode = members[memberIndex];
		memberIndex++;
		if (!memberNode) {
			continue;
		}
		if (TsAST.isTypeReferenceNode(memberNode)) {
			let typeName = "";
			if (TsAST.isIdentifier(memberNode.typeName)) {
				typeName = memberNode.typeName.text;
			} else if (TsAST.isQualifiedName(memberNode.typeName)) {
				typeName = memberNode.typeName.right.text;
			}

			if (typeName === "Promise" && memberNode.typeArguments) {
				const [inner] = memberNode.typeArguments;
				if (inner) {
					if (TsAST.isUnionTypeNode(inner)) {
						members.push(...inner.types);
					} else {
						members.push(inner);
					}
				}
				continue;
			}

			if (typeName === "Success" && memberNode.typeArguments) {
				const [typeArg] = memberNode.typeArguments;
				if (typeArg) {
					const transformed = await DCommon.asyncPipe(
						context.transform(typeArg, typeTransformers.value),
						DEither.unwrapRight,
					);
					if (!DEither.isLeft(transformed)) {
						let res = transformed.result;
						if (DModeling.hasTagValue(res, "[node][type]array")) {
							res = GoAST.createSliceType({ elementType: (res as GoAST.ArrayType).elementType });
						}
						return res;
					}
				}
			}

			if (typeName === "Right" && memberNode.typeArguments) {
				const [, rightArg] = memberNode.typeArguments;
				if (rightArg) {
					const transformed = await DCommon.asyncPipe(
						context.transform(rightArg, typeTransformers.value),
						DEither.unwrapRight,
					);
					if (!DEither.isLeft(transformed)) {
						let res = transformed.result;
						if (DModeling.hasTagValue(res, "[node][type]array")) {
							res = GoAST.createSliceType({ elementType: (res as GoAST.ArrayType).elementType });
						}
						return res;
					}
				}
			}
		}
	}

	return undefined;
}
