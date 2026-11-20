import { DEither } from "@duplojs/lang";

/**
 * Exemple retravaillé manuellement illustrant la problématique des Unions :
 * La fonction 'divide' renvoie une union entre un succès numérique et un échec.
 */
export function divide(numerator: number, denominator: number): DEither.Success<number> | DEither.Fail {
    if (denominator === 0) {
        return DEither.fail();
    }
    return DEither.success(numerator / denominator);
}

// Utilisation d'un garde de type monadique
const calculation = divide(10, 2);

if (DEither.isRight(calculation)) {
    // Dans cette branche, calculation est garanti d'être Success<number>
    console.log("Résultat valide :", calculation);
} else {
    console.log("Calcul impossible (division par zéro).");
}
