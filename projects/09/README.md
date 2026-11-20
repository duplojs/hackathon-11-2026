# Projet 09

## Problématique

### Regrouper des résultats en une transaction

Dans `index.ts`, plusieurs calculs indépendants produisent chacun un résultat `Either`. `DEither.group` doit les réunir pour former un résultat unique : la transaction ne peut être considérée comme réussie que si tous les calculs réussissent. Comment regrouper ces résultats en conservant les valeurs de réussite et en propageant un échec à l’ensemble de la transaction ?

La gauche porte un `float64`, tandis que le succès porte un `[]float64` :
l'ADR-12 utilise donc A' `Either2[float64, []float64]` uniquement ici. `group`
parcourt la collection déjà évaluée, renvoie le premier gauche ou construit
`Success(out)`. Voir [docs/exercises/09.md](../../docs/exercises/09.md).
