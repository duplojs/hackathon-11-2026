import * as DCommon from "@duplojs/lang/common";
import { nullShardDependency } from "./null";
import { undefinedShardDependency } from "./undefined";
import { inspectSharedDependency } from "./inspect";

export { nullShardDependency, undefinedShardDependency, inspectSharedDependency };

// Dépendances toujours émises dans shard_dependencies.go. inspect en fait partie :
// InspectEntry est utilisé à la fois par Print (formateur) et par la méthode
// InspectEntries de Either, qui peut exister sans aucun appel à print (ex. 00).
// build.ts fusionne cette liste et les dépendances enregistrées par ensemble :
// une dépendance aussi enregistrée via context.registerSharedDependency
// (handler print) n'est donc émise qu'une seule fois.
export const defaultSharedDependencies = DCommon.memo(() => [
	nullShardDependency.value,
	undefinedShardDependency.value,
	inspectSharedDependency.value,
]);
