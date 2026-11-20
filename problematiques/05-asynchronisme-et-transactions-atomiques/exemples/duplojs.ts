import { DEither, DCommon, DArray, DString } from "@duplojs/lang";

// Étape élémentaire asynchrone sécurisée
async function safeDivision(numerator: number, denominator: number) {
    if (denominator === 0) {
        return DEither.left("divide-by-zero", denominator);
    }
    return DEither.success(numerator / denominator);
}

/**
 * Exemple retravaillé illustrant la transaction tout-ou-rien :
 * Le groupe exécute séquentiellement 3 getters paresseux.
 * Le 3e getter échoue (division par zéro) -> annulation globale.
 */
async function main() {
    const transactions = DEither.asyncGroup([
        () => safeDivision(10, 2),  // 5 (succès)
        () => safeDivision(20, 4),  // 5 (succès)
        () => safeDivision(15, 0),  // Erreur division par zéro -> court-circuit
    ]);

    const result = await DCommon.asyncPipe(
        transactions,
        DEither.whenIsRightOtherwise(
            (values) => DArray.map(values, DString.to),
            () => ["transaction annulée"]
        )
    );

    console.log(result); // Affiche : [ 'transaction annulée' ]
}

main();
