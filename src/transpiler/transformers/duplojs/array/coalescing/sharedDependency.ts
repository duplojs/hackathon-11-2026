import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const arrayCoalescingFunctionIdentifier = GoAST.createIdentifier("ArrayCoalescing");

export const arrayCoalescingDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("T");
	const value = GoAST.createIdentifier("v");

	const typeParameter = GoAST.createTypeParameter({
		identifier: generic,
		constraint: GoAST.builtinTypeReferences.any,
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: arrayCoalescingFunctionIdentifier,
				generic: [typeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: value,
						type: generic,
					}),
				],
				returnTypes: [
					GoAST.createSliceType({
						elementType: generic,
					}),
				],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createSliceLiteral({
									typeReference: GoAST.createSliceType({
										elementType: generic,
									}),
									elements: [value],
								}),
							],
						}),
					],
				}),
			}),
		],
	});
});
