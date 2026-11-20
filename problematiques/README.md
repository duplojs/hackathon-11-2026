# Problématiques étudiées

Ce dossier présente notre travail **par problématique**, et non par exercice. Chaque dossier contient :

- `README.md` : la problématique et la stratégie retenue, en court ;
- `HISTORIQUE.md` : les pistes explorées, celles que nous avons écartées et pourquoi, l’évolution du choix et ses limites ;
- `exemple.ts` et `exemple.go` : des exemples courts **écrits à la main** pour illustrer la stratégie. Ce n’est pas du code généré par le transpileur ; le Go généré est dans `projects/XX/dist/` après un build.

Chaque `exemple.go` affiche exactement la même chose que son `exemple.ts` (voir « Vérifier les exemples »).

## Découpage

| Dossier | Question | Exercices |
|---|---|---|
| [01-nombres-et-types](01-nombres-et-types/) | Comment représenter `number`, les types brandés, `null` et `undefined` sans changer un seul calcul ? | tous |
| [02-representation-either](02-representation-either/) | Comment représenter un Either et une fonction qui renvoie plusieurs variantes ? | 00, 01, 04, 06, 11 |
| [03-passage-a-l-echelle-des-unions](03-passage-a-l-echelle-des-unions/) | Quelle représentation reste valable avec 13 variantes de types différents ? | 06, 07, 11 |
| [04-appels-et-generiques](04-appels-et-generiques/) | Comment appeler une fonction générique en gardant l’ordre d’évaluation ? (bug du projet 00) | 00, tous |
| [05-controle-de-flux](05-controle-de-flux/) | Comment traduire `if`, le ternaire, `&&` et `\|\|` sans exécuter ce qui ne doit pas l’être ? | 01, 04, 06 |
| [06-composition-fonctionnelle](06-composition-fonctionnelle/) | Comment traduire `pipe`, `whenIsRight` et `rightPipe` sans perdre sémantique ni performance ? | 02, 03, 04, 05, 07 |
| [07-collections-et-tuples](07-collections-et-tuples/) | Comment représenter des tuples, les déstructurer, et traiter une collection de résultats ? | 05, 08, 09, 10 |
| [08-erreurs-identifiees](08-erreurs-identifiees/) | Comment distinguer les erreurs par leur information avec `matchInformation` ? | 06, 07, 11 |
| [09-asynchronisme](09-asynchronisme/) | Comment traduire `async`, `await` et `asyncGroup` sans changer l’ordre des opérations ? | 10 |
| [10-retrecissement-de-type](10-retrecissement-de-type/) | Comment traduire le rétrécissement de type de TypeScript, alors qu’une variable Go garde son type ? | 11 |
| [11-chaines-de-caracteres](11-chaines-de-caracteres/) | Comment traduire les fonctions de chaînes quand JS compte en UTF-16 et Go en UTF-8 ? | 05 à 11 |
| [12-affichage-et-verification](12-affichage-et-verification/) | Comment afficher les valeurs, et prouver que le Go se comporte comme le TypeScript ? | tous |
| [benchmarks](benchmarks/) (bonus) | Combien coûte notre représentation des Either, comparée à Node ? | 00, 06 |

Les dossiers 02 et 03 portent la décision centrale du projet : **une interface `Either` et un type Go par constructeur DuploJS**. La plupart des autres stratégies en découlent.

## Organisation de l’équipe

- **Règles communes avant le code** : un skill d’équipe ([`.agents/skills/duplojs-go-strategies/SKILL.md`](../.agents/skills/duplojs-go-strategies/SKILL.md)) rassemble les règles de traduction, chacune marquée « proposé » ou « décidé » avec sa justification. Il était mis à jour avant chaque implémentation, et nos agents IA s’en servaient comme cadre.
- **Répartition** :
  - Aziz Nasraoui : représentation des Either et passage à l’échelle, appels et génériques, contrôle de flux, `matchInformation`, affichage, méthode de vérification et benchmarks (problématiques 01, 02, 03, 04, 05, 08, 12).
  - Louis-Martin Vanderlynden : composition fonctionnelle, collections et tuples, asynchronisme, rétrécissement de type, chaînes de caractères (problématiques 06, 07, 09, 10, 11).
  - Lucas Ratiaray : [à compléter].
- **Travail en parallèle** : une branche Git par lot d’exercices, fusionnées dans `main` par pull request. Chaque contribution a été revérifiée par un autre membre (sortie identique à Node sur les 12 projets) avant fusion.

## Vérifier les exemples

Depuis la racine du dépôt, après `pnpm install` :

```sh
for dir in problematiques/[0-9]*/; do
  ts=$(node_modules/.bin/tsx "$dir/exemple.ts")
  go=$(cd "$dir" && go run exemple.go)
  [ "$ts" = "$go" ] && echo "$dir : identique" || echo "$dir : différent"
done
```
