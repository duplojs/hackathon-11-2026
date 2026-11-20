import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { transformCallExpression } from "../../../shared";
import { goTypeOfExpression } from "../../../type/goTypeOf";
import { inspectSharedDependency, printFunctionIdentifier } from "../../../../sharedDependency/defaults/inspect";

// DCommon.print n'accepte qu'une forme à un argument dans les exercices
// 01 à 10 ; `params` (le 2e argument optionnel de l'API, voir
// docs/duplojs-semantics.md) n'est pas pris en charge ici.
//
// `DCommon.print(x)` est systématiquement utilisé comme instruction isolée
// dans les 10 exercices (jamais affecté ni retourné), contrairement à
// `DEither.success`. Dans ce cas, `transformCallExpression` (shared/call.ts)
// résout d'abord l'appelé via `context.transform(node.expression, ...)` :
// notre routeur ne reçoit alors que l'accès de propriété `DCommon.print`,
// pas l'appel entier, et ne peut donc pas lire l'argument pour instancier
// `Print[T]`. On retrouve l'appel englobant via `node.parent` (comme le fait
// déjà `context.error` pour ses diagnostics) afin de calculer T dans les
// deux cas : appelé directement sur l'appel, ou sur l'accès de propriété
// appelant.
function findCallNode(node: TsAST.Node): TsAST.CallExpression | undefined {
	if (TsAST.isCallExpression(node)) {
		return node;
	}

	if (TsAST.isCallExpression(node.parent) && node.parent.expression === node) {
		return node.parent;
	}

	return undefined;
}

export async function printExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const callNode = findCallNode(node);

	if (!callNode) {
		// `print` référencé sans être appelé (ex. passé comme valeur à une
		// fonction d'ordre supérieur) : aucun site d'appel où lire T. Ce cas
		// n'apparaît dans aucun des exercices 01 à 10.
		const packageName = context.registerSharedDependency(inspectSharedDependency.value);

		return context.success({
			result: GoAST.createSelectorExpression({
				target: packageName,
				identifier: printFunctionIdentifier,
			}),
		});
	}

	if (!DArray.lengthEqual(callNode.arguments, 1)) {
		return context.error(callNode, "duplojs-common-print-single-argument-only");
	}

	const argumentNode = DArray.first(callNode.arguments);

	if (!argumentNode) {
		return context.error(callNode, "missing-print-value");
	}

	// D16 : type Go DÉCLARÉ de l'argument (variable Go), pas le type rétréci par
	// TypeScript après un `if (isLeft(x))` (qui donnerait Print[Either[JSUndefined]]).
	const genericArgument = await DCommon.asyncPipe(
		goTypeOfExpression(argumentNode, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(genericArgument)) {
		return genericArgument;
	}

	const packageName = context.registerSharedDependency(inspectSharedDependency.value);

	const instantiatedPrint = GoAST.createInstantiationExpression({
		target: GoAST.createSelectorExpression({
			target: packageName,
			identifier: printFunctionIdentifier,
		}),
		typeArguments: DCommon.cast([genericArgument.result]),
	});

	if (node === callNode) {
		return transformCallExpression(callNode, context, instantiatedPrint);
	}

	// `node` est l'accès de propriété appelé par `callNode` : on laisse
	// `transformCallExpression` (invoqué par l'appelant pour `callNode`)
	// transformer les arguments et assembler l'appel ; on ne renvoie ici que
	// l'appelé, déjà instancié.
	return context.success({ result: instantiatedPrint });
}
