// Refusé : variante Either absente de la table des types (Right).
import * as DEither from "@duplojs/lang/either";
export function check(value: number): DEither.Right<"positive", number> | DEither.Success<number> {
	return DEither.success(value);
}
