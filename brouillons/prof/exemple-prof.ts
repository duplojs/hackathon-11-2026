// Exemple partagé par le prof (copie telle quelle).
import * as DString from "@duplojs/lang/string";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import type * as DNumber from "@duplojs/lang/number";

function checkUserName(username: string) {
    if (DString.test(username, /[0-9]/)) {
        return DEither.left("must-be-not-contain-number");
    }

    if (DString.includes(username, "@")) {
        return DEither.error(null);
    }

    return DEither.right("valid-username", username);
}

function main() {
    const checkedUsername = DCommon.pipe(
        "test",
        checkUserName,
        DEither.unwrapRight,
    );

    if (DEither.isLeft(checkedUsername)) {
        return checkedUsername;
    }

    return DCommon.pipe(
        checkedUsername,
        DString.length,
        DEither.success,
    );
}

type _check = DCommon.ExpectType<
    ReturnType<typeof main>,
    (
        | DEither.Left<"must-be-not-contain-number", undefined>
        | DEither.Error<null>
        | DEither.Success<number & DNumber.Positive>
    ),
    "strict"
>;
