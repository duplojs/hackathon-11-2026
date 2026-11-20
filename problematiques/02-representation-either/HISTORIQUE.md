# Historique — représenter un Either

## Point de départ

Nous avons lu le runtime (`@duplojs/lang/dist/either`) : un Either est un objet avec une marque `right` **ou** `left`, une `information` et une `value`. `success(v)` ajoute la marque `success` et l’information `"success"` ; `fail()` ajoute `fail`, l’information `"fail"` et une valeur `undefined`. Le boilerplate fournissait seulement `EitherSuccess[T]`, défini comme un **alias** de struct.

## Pistes explorées

### Piste A — `any` partout (écartée)

Simple, mais on perd tout typage : chaque valeur est boxée et chaque lecture demande une vérification à l’exécution. C’est l’inverse du gain de performance recherché.

### Piste B — une struct plate générique `Either[R, L]` (écartée)

```go
type Either[R any, L any] struct {
	IsRight     bool
	Information string
	Right       R
	Left        L
}
```

- **Avantage** : une valeur sur la pile, sans allocation ni appel dynamique.
- **Problème rencontré** : dans `return EitherSuccessOf(x)`, Go ne peut pas déduire `L` à partir du type de retour attendu. Il aurait fallu calculer `R` et `L` avec le checker TypeScript pour chaque union, et instancier explicitement chaque constructeur.
- **Problème découvert plus tard** (voir `03-passage-a-l-echelle-des-unions`) : un seul `L` ne peut pas porter deux erreurs dont les valeurs ont des types différents.

### Piste C — une interface et un type par constructeur (retenue)

Go convertit automatiquement une struct vers une interface qu’elle implémente : `return EitherSuccessOf(x)` et `return EitherLeftOf("…", v)` compilent tels quels dans une fonction qui renvoie `Either`. **Les retours multiples ne demandent aucune règle particulière.**

## Évolution du choix

1. **Projet 01** : l’interface n’avait qu’une méthode, `IsRight()`. `EitherSuccess` a dû passer d’alias à **type défini**, car Go interdit d’ajouter une méthode à un alias de struct anonyme.
2. **Projet 04** : variante `EitherFail`, avec une valeur `undefined` omise du JSON (`omitzero`).
3. **Projet 06** : `matchInformation` a besoin de l’information et de la valeur, d’où les méthodes `GetInformation()` et `GetValue()`, générées pour toutes les variantes par une seule fonction (`createEitherMethods`).
4. **Projet 11** (Louis-Martin) : variantes `EitherRight` et `EitherError`. Rien d’autre à changer.

## Coût mesuré

Convertir une struct vers l’interface alloue sur le tas : **1 allocation de 24 à 32 octets, environ 20 ns** (voir `benchmarks/`). Une variante seule (`Success<number>`) garde son type concret : **0 allocation, moins d’une nanoseconde**.

## Vision à long terme

Garder l’interface comme représentation générale, et produire une struct plate uniquement sur les chemins chauds identifiés par un benchmark.
