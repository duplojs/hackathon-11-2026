import { GoAST } from "@go";
import * as DCommon from "@duplojs/lang/common";

/** `cible = valeur`, raccourci quand il n'y a qu'une cible et une valeur. */
export function createSimpleAssignment(
	target: GoAST.AssignmentTarget,
	value: GoAST.Expression,
) {
	return GoAST.createAssignmentStatement({
		targets: DCommon.cast([target]),
		values: DCommon.cast([value]),
	});
}
