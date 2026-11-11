import * as DEither from "@duplojs/lang/either";

export function createResult(isSuccess: boolean) {
	if (isSuccess) {
		return DEither.right("success", "Result from the project file");
	}

	return DEither.left("failure", "Result from the project file");
}
