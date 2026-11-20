import * as DCommon from "@duplojs/lang/common";
import { nullShardDependency, nullTypeIdentifier } from "./null";
import { undefinedShardDependency, undefinedTypeIdentifier } from "./undefined";

export { nullShardDependency, nullTypeIdentifier, undefinedShardDependency, undefinedTypeIdentifier };

export const defaultSharedDependencies = DCommon.memo(() => [
	nullShardDependency.value,
	undefinedShardDependency.value,
]);
