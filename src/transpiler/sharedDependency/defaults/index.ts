import * as DCommon from "@duplojs/lang/common";
import { nullShardDependency } from "./null";
import { undefinedShardDependency } from "./undefined";
import { promiseShardDependency } from "./promise";

export { nullShardDependency, undefinedShardDependency, promiseShardDependency };

export const defaultSharedDependencies = DCommon.memo(() => [
	nullShardDependency.value,
	undefinedShardDependency.value,
	promiseShardDependency.value,
]);
