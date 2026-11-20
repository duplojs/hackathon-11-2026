// Même logique que exemple-prof.ts, avec un paramètre pour tester plusieurs entrées.
import * as DString from "@duplojs/lang/string";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

function checkUserName(username: string) {
	if (DString.test(username, /[0-9]/)) {
		return DEither.left("must-be-not-contain-number");
	}
	if (DString.includes(username, "@")) {
		return DEither.error(null);
	}
	return DEither.right("valid-username", username);
}

function main(username: string) {
	const checkedUsername = DCommon.pipe(username, checkUserName, DEither.unwrapRight);
	console.log("  unwrapRight ->", typeof checkedUsername === "string" ? `string ${JSON.stringify(checkedUsername)}` : "objet Either (inchangé)");
	if (DEither.isLeft(checkedUsername)) {
		return checkedUsername;
	}
	return DCommon.pipe(checkedUsername, DString.length, DEither.success);
}

for (const input of ["test", "test1", "te@st", "été😀"]) {
	console.log(`main(${JSON.stringify(input)})`);
	DCommon.print(main(input));
}
