import * as NodePath from "node:path";
import { pathToFileURL } from "node:url";
import * as DPath from "@duplojs/lang/path";

export function toNativePath(path: string) {
	if (process.platform !== "win32") {
		return path;
	}

	const normalizedPath = path.replaceAll("\\", "/");
	const drivePath = normalizedPath.replace(/^\/([a-z]:\/)/i, "$1");

	return NodePath.win32.normalize(drivePath);
}

export function toDPathAbsolute(path: string) {
	const normalizedPath = process.platform === "win32"
		? decodeURIComponent(pathToFileURL(path).pathname)
		: path;

	return DPath.createAbsolute(normalizedPath);
}
