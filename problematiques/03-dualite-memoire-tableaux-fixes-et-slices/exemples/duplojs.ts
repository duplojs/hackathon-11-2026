import { DEither, DArray, DString } from "@duplojs/lang";

/**
 * Exemple retravaillé illustrant le passage d'un tuple fixe vers un combinateur :
 * DArray.coalescing transforme une valeur scalaire en tuple unitaire [number].
 * DArray.map applique ensuite la conversion vers une chaîne sur chaque élément.
 */
const initialResult = DEither.success(42);

// 1. Aiguillage produisant le tuple fixe [42] ou [-1]
const container = DEither.whenIsRightOtherwise(
    initialResult,
    DArray.coalescing, // 42 -> [42] (type tuple [number])
    () => [-1]
);

// 2. Mapping de la collection vers un tableau de chaînes ['42']
const formattedStrings = DArray.map(container, DString.to);

console.log(formattedStrings);
