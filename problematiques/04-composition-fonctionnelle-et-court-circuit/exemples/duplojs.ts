import { DEither } from "@duplojs/lang";

// Fonctions individuelles du pipeline
function parseNumber(raw: string) {
    const n = Number(raw);
    if (isNaN(n)) return DEither.left("not-a-number", raw);
    return DEither.success(n);
}

function divideByTwo(val: number) {
    if (val === 0) return DEither.fail();
    return DEither.success(val / 2);
}

function formatResult(val: number) {
    return DEither.success(`Résultat : ${val}`);
}

/**
 * Exemple retravaillé illustrant le pipeline monadique rightPipe :
 * S'interrompt immédiatement si 'parseNumber' ou 'divideByTwo' échoue.
 */
const pipeline = DEither.rightPipe(
    "42",
    parseNumber,
    divideByTwo,
    formatResult
);

console.log(pipeline);
