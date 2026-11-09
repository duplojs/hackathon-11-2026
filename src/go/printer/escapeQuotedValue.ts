import * as DString from "@duplojs/lang/string";

export function escapeQuotedValue(
	value: string,
	quote: "\"" | "'" = "\"",
	mode: "text" | "bytes" = "text",
) {
	// eslint-disable-next-line no-control-regex -- Les caractères de contrôle doivent être échappés en Go.
	const pattern = /[\\'"\x00-\x1f\x7f-\x9f\u2028\u2029\ufeff]/gu;
	const escaped = DString.replaceAll(
		value,
		mode === "bytes" ? /[\s\S]/g : pattern,
		({ matchedValue }) => {
			if (mode === "bytes") {
				// DuploJS ne fournit pas de conversion d'un code de caractère en hexadécimal.
				return `\\x${DString.padStart(matchedValue.charCodeAt(0).toString(16), 2, "0")}`;
			}
			if (matchedValue === "\\" || matchedValue === quote) {
				return `\\${matchedValue}`;
			}
			if (matchedValue === "'" || matchedValue === "\"") {
				return matchedValue;
			}
			return `\\u${DString.padStart(matchedValue.charCodeAt(0).toString(16), 4, "0")}`;
		},
	);
	return `${quote}${escaped}${quote}`;
}
