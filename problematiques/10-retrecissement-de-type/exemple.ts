import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DString from "@duplojs/lang/string";

function checkUserName(username: string) {
	if (DString.test(username, /[0-9]/)) {
		return DEither.left("must-be-not-contain-number");
	}
	if (DString.includes(username, "@")) {
		return DEither.error(null);
	}

	return DEither.right("valid-username", username);
}

function usernameLength(username: string) {
	// string | Left<...> | Error<null>
	const checked = DCommon.pipe(username, checkUserName, DEither.unwrapRight);

	if (DEither.isLeft(checked)) {
		return checked;
	}

	// Ici, TypeScript sait que checked est un string.
	return DEither.success(DString.length(checked));
}

for (const username of ["test", "abc1", "a@b"]) {
	console.log(DEither.matchInformation(usernameLength(username), {
		success: (value) => DString.to(value),
		"must-be-not-contain-number": () => "contient un chiffre",
		error: () => "contient un @",
	}));
}
