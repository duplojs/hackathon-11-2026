# 06 · Composer des résultats `Either`

**Projets concernés** : 02, 03, 05, 07, 08, 10.

## Problématique

DuploJS fournit des combinateurs qui décident **selon l'issue** d'un résultat :

| Combinateur | Sémantique |
|---|---|
| `whenIsRight(r, f)` | applique `f` à la valeur d'un succès, recopie l'échec tel quel |
| `whenIsRightOtherwise(r, f, g)` | `f` pour un succès, `g` pour le reste. Le type de sortie peut être une union |
| `rightPipe(r, f1, f2, …)` | enchaîne des étapes dépendantes et **s'arrête au premier échec** |

Comment les traduire en Go en gardant l'ordre d'évaluation, l'arrêt au premier échec et des types exacts, **pour un nombre quelconque d'étapes** ?

## Stratégie retenue

- **Classement à la compilation** : chaque membre de l'union d'entrée est classé (Right / non-Right) d'après son type. À l'exécution, il ne reste qu'un test d'étiquette.
- **`whenIsRight` / `whenIsRightOtherwise`** → `if / else` sur l'étiquette. Le type de sortie vient du checker : un type commun (projet 05 : `[1]float64`) ou une union, alimentée par `placeValue` (problématique 02).
- **`rightPipe`** → fonction anonyme appelée immédiatement. Chaque échec est un **`return` anticipé** : le code reste plat, quelle que soit la longueur du pipe. Une étape qui renvoie une valeur simple est enveloppée dans un `Success`.
- **Formes curryfiées** → fermetures (problématique 03).

## Exemple

```bash
pnpm exec tsx problematiques/analyse-detaillee/06-composition-either/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./06-composition-either/exemples
```

L'exemple couvre un `rightPipe` à trois étapes (dont une qui renvoie une valeur simple), un échec à chaque étape possible, et un `whenIsRightOtherwise` dont les branches ont des types différents (`number | string`).

Voir [HISTORIQUE.md](HISTORIQUE.md).
