# Représenter un Either

## Problématique

Un `Either` DuploJS est le résultat d’un calcul qui réussit (`success`, `right`) ou échoue (`left`, `fail`, `error`). Il porte une **information** (`"success"`, `"negative-operand"`…) et une **valeur**. Une fonction peut renvoyer plusieurs variantes selon le chemin pris. Comment représenter ces variantes et leurs unions en Go, en gardant le type de chaque valeur ?

## Stratégie retenue

- Une **struct Go par constructeur** DuploJS (`EitherSuccess[T]`, `EitherLeft[T]`, `EitherFail`, `EitherRight[T]`, `EitherError[T]`), avec les mêmes champs que l’objet JS.
- Toutes implémentent une **interface** `Either` : `IsRight()`, `GetInformation()`, `GetValue()`.
- Une union de variantes devient l’interface ; une variante seule garde son type concret.
- `DEither.isRight(x)` devient `x.IsRight()`.

## Exercices concernés

00, 01, 04, 06, 11 (et toutes les opérations sur les Either).

## Fichiers

- `HISTORIQUE.md` : les trois représentations étudiées et pourquoi l’interface l’a emporté.
- `exemple.ts` / `exemple.go` : une fonction à deux chemins de retour.
