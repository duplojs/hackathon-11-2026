# 04 · Expressions sans équivalent Go

**Projets concernés** : 06, 08, 09.

## Problématique

Certaines constructions TypeScript sont des **expressions** alors que leur équivalent Go est une **instruction**, ou n'existe pas du tout :

| TypeScript | Go |
|---|---|
| `cond ? a : b` | pas d'opérateur ternaire |
| `a \|\| b`, `a && b` avec un côté droit complexe | le court-circuit existe, mais les préparations du côté droit (problématique 01) casseraient l'évaluation paresseuse si on les émettait avant |
| `([one, , divisor]) => …` | pas de motif dans les paramètres |

Le défi : les traduire **à l'intérieur d'une expression** (argument d'appel, `return`, opérande) sans changer quelles parties sont évaluées, ni dans quel ordre.

## Stratégie retenue

Tout repose sur le contrat `{ before, result }` de la problématique 01 : une expression peut **émettre des instructions** avant de fournir sa valeur.

- **Ternaire** → `var result T` + `if / else`, émis dans `before`. `T` est le type du checker pour l'expression entière. `result` sert ensuite de valeur ordinaire.
- **`||` / `&&`** → si le côté droit n'a pas de préparation, on garde l'opérateur Go. Sinon, ses préparations vont dans un `if !left { … }` (ou `if left { … }` pour `&&`).
- **Déstructuration** → paramètre reçu sous un nom généré, puis `one := tuple[0]`… au début du corps. Les trous sont ignorés.

## Exemple

```bash
pnpm exec tsx problematiques/analyse-detaillee/04-expressions-sans-equivalent-go/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./04-expressions-sans-equivalent-go/exemples
```

Les deux sorties sont identiques. En particulier, `teste two` n'apparaît **jamais**, ce qui prouve que le court-circuit est respecté.

Voir [HISTORIQUE.md](HISTORIQUE.md).
