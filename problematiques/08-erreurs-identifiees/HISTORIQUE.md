# Historique — erreurs identifiées et `matchInformation`

## Distinguer les variantes : sur quoi faire le `switch` ?

- **Piste écartée : un `switch` sur le type Go** (`switch v := result.(type)`). Deux erreurs `left("negative-operand", 1)` et `left("division-by-zero", 0)` ont le **même** type Go, `EitherLeft[float64]` : le type ne suffit pas à les distinguer.
- **Piste retenue : un `switch` sur l’information**, une chaîne. C’est exactement ce que fait le runtime DuploJS, qui indexe le matcher par information. D’où l’ajout de la méthode `GetInformation()` à l’interface `Either` (projet 06).

## Lire la valeur d’une variante

- **Piste écartée** : convertir vers le type de la variante (`result.(EitherLeft[float64]).Value`). Il faudrait savoir quelle variante porte quelle information, et le code changerait selon la variante.
- **Piste retenue** : une méthode commune `GetValue() any`, puis une conversion vers le type du paramètre du traitement, que le checker connaît même quand le source ne l’écrit pas. Une seule règle, pour toutes les variantes.

## Ordre d’évaluation

En JS, l’objet matcher (et donc chaque fonction) est construit **avant** l’appel à `matchInformation`. Le Go généré crée donc les traitements avant le `switch`, dans l’ordre du source.

## Limite trouvée en vérifiant

`left("…")` **sans valeur** (projet 11) : le Go affiche `"value": null`, alors que `JSON.stringify` omet une propriété `undefined`. Piste : une méthode `MarshalJSON` sur `EitherLeft` qui omet un `JSUndefined`.
