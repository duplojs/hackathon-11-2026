import { DEither } from "@duplojs/lang";

/**
 * Exemple retravaillé illustrant le passage à l'échelle des retours multiples :
 * Une fonction métier sans annotation comportant 3 chemins de retours hétérogènes.
 */
export function processTransaction(amount: number, userActive: boolean) {
    // Chemin 1 : Échec générique
    if (amount <= 0) {
        return DEither.fail();
    }
    // Chemin 2 : Erreur contextuelle identifiée
    if (!userActive) {
        return DEither.left("inactive-account", amount);
    }
    // Chemin 3 : Succès nominal
    return DEither.success({
        id: "tx-1234",
        balance: amount - 5,
    });
}

// Inférence automatique par TypeScript :
// type Return = EitherFail | EitherLeft<"inactive-account", number> | EitherSuccess<{ id: string, balance: number }>
