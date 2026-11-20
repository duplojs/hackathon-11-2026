# ADR-12 : `Either2` et `group`

- **Statut :** accepté (Sprint 4)
- **Portée :** exercice 09
- **Dépend :** ADR-1 (A'), ADR-2

## Contexte

`DEither.group(calculations)` renvoie le premier `Left` tel quel ; si aucun
élément n'est gauche, il renvoie `Success(valeurs)`. Pour l'exercice 09, la
valeur gauche est `float64`, tandis que la valeur droite est `[]float64`.
L'ADR-1 A (`Either[V]`) ne peut représenter les deux avec un seul `V`.

Les entrées de `group` sont déjà calculées. Le groupement ne doit donc pas
prétendre éviter l'évaluation des calculs.

## Décision de représentation

On utilise A' uniquement pour les côtés dont les types Go diffèrent :

```go
type Either2[L any, R any] struct {
    Kind EitherKind
    Information string
    Left L
    Right R
}
```

Le runtime partagé fournit `Either2SuccessOf[L,R]`,
`Either2FromLeft[L,R]`, `IsRight`, `IsLeft`, `InspectEntries` et `InspectPlain`.
La conversion de gauche conserve `Kind` et `Information` et copie `Value` vers
`Left`. `InspectEntries` conserve le même format, le même ordre de clés et les
mêmes tags que `Either`. `InspectPlain` renvoie toujours `(nil, false)`.

Le contrat `getEitherValueAccess` donne `{ valueType, field }` : `Value` pour
`Either[V]`, `Right` pour `Either2[L,R]`. Les handlers `rightPipe` et
`whenIsRight` passent par cet accès ; `matchInformation` refuse explicitement
`Either2` tant que le traitement distinct des valeurs gauche/droite n'est pas
implémenté.

## Inlinage de `group`

La source est évaluée une fois. Le Go généré préalloue `out` avec
`make([]R, 0, len(arr))`, parcourt les éléments avec `range`, ajoute chaque
valeur droite et s'arrête au premier gauche. Une entrée gauche est convertie par
`Either2FromLeft`; en l'absence de gauche, `Either2SuccessOf(out)` produit le
résultat. Le tableau vide donne donc `Success([])`.

Un objet (`Record`), un getter ou une entrée qui n'est pas une slice est refusé
explicitement. Les groupes asynchrones restent hors périmètre.

## Vérification

**[observé]** `projects/09` et les variantes `09-group-all-right`,
`09-group-first-left` et `09-group-empty` correspondent à `tsx`. Elles vérifient
la réussite, le premier gauche (ordre conservé) et le tableau vide.
`go build -gcflags=-m` indique que `Either2FromLeft` et `Either2SuccessOf` sont
inlinables ; la slice `out` s'échappe vers le tas parce qu'elle est conservée
dans le résultat.

Voir [la fiche 09](../exercises/09.md) pour le code produit réel et les résultats.
