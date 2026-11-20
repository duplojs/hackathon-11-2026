# ADR-10 : `rightPipe` inliné

- **Statut :** accepté (Sprint 4)
- **Portée :** exercice 07, forme directe
- **Reproduire :** `./scripts/check.sh 07`

## Contexte

`DEither.rightPipe(e, f1, …, fn)` enchaîne les calculs qui dépendent du succès
précédent. Une entrée gauche est renvoyée sans appeler de callback. Chaque étape
reçoit la valeur déballée de l'étape précédente et la première gauche interrompt
la suite. Une valeur nue finale devient `Success` une seule fois, à la fin.

Dans l'exercice 07, chaque gauche et chaque succès porte un `number` : A,
`Either[float64]`, suffit.

## Options

1. Une closure qui boucle sur les callbacks : compacte, mais introduit une
   allocation possible et rend le court-circuit moins visible.
2. Des `func` literals à retours anticipés : idiomatique, mais chaque étape
   ajoute une fonction.
3. Des `if` imbriqués générés à la transpilation : pas de wrapper de pipeline,
   évaluation unique de l'entrée, ordre et court-circuit explicites.

## Décision

La forme directe est traduite par des `if` imbriqués. Le transpileur lie l'entrée
une fois, teste `IsLeft`, puis applique le callback uniquement dans la branche
Right. Les callbacks fléchés à corps-expression sont eux-mêmes inlinés dans un
bloc Go, sans `func` literal ; les callbacks nommés restent des appels normaux.
Une étape intermédiaire qui renvoie un type nu n'ajoute pas de test `IsLeft`.

Chaque sortie Either est coercée vers le type de résultat de l'appel. Une valeur
nue finale est enveloppée avec `EitherSuccessOf`; une sortie Either finale n'est
pas ré-enveloppée. Les formes curryfiées et les étapes asynchrones restent hors
périmètre.

## Vérification

**[observé]** `projects/07` et ses variantes `07-three-steps`,
`07-plain-step`, `07-left-input` et `07-division` sont comparés à `tsx`.
Le troisième callback de `07-three-steps` n'imprime rien après le gauche de
l'étape 2. La division flottante affiche `Infinity` et `-Infinity` comme en JS.

`go build -gcflags=-m ./...` dans `projects/07/dist` indique que les appels
générés peuvent être inlinés ; aucune closure du pipeline n'est générée.
Voir [la fiche 07](../exercises/07.md) pour le Go produit.
