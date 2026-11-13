import * as DCommon from "@duplojs/lang/common";
import { nullShardDependency } from "./null";
import { undefinedShardDependency } from "./undefined";

export { nullShardDependency, undefinedShardDependency };

export const defaultSharedDependencies = DCommon.memo(() => [
	nullShardDependency.value,
	undefinedShardDependency.value,
]);
