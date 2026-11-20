# Nombres et types primitifs

## Problématique

Comment représenter en Go les types de base de TypeScript (`number`, `string`, `boolean`, `null`, `undefined`) et les types « brandés » de DuploJS (`number & DNumber.Positive`, `string & Number`), sans changer le résultat d’un seul calcul ?

## Stratégie retenue

- `number` → `float64`, et chaque littéral est converti en `float64` avant le calcul.
- Types brandés, littéraux (`3`, `"a"`) et unions de littéraux → le type de base (`float64`, `string`).
- `null` et `undefined` → structs vides `JSNull` et `JSUndefined` (0 octet).

## Exercices concernés

Tous (00 à 11).

## Fichiers

- `HISTORIQUE.md` : pistes explorées et justification des choix.
- `exemple.ts` / `exemple.go` : `0.1 + 0.2`, `3 / 2` et un type brandé. Même sortie des deux côtés.
