import * as DSCommon from "@duplojs/server/common";
import * as DPath from "@duplojs/lang/path";

export function toTypescriptPath(path: string) {
	const absolute = DPath.isAbsolute(path)
		? path
		: DSCommon.normalizePlatformPath(path);

	if (absolute && DPath.isAbsolute(absolute)) {
		return DSCommon.toPlatformPathOrThrow(absolute);
	}

	return path;
}

export function absoluteFromTypescriptPath(path: string) {
	const normalized = DSCommon.normalizePlatformPath(path);

	return DPath.createAbsolute(normalized ?? path);
}
