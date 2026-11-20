# Transpileur TypeScript (DuploJS) → Go · Analyse détaillée

Ce dossier complète la [synthèse en 5 problématiques](../README.md) : il détaille le **raisonnement** derrière le transpileur, un dossier par problème de traduction. Chaque dossier contient :

- `README.md` : la problématique et la stratégie retenue, en bref ;
- `HISTORIQUE.md` : les pistes explorées, les choix, leurs justifications et la vision à long terme ;
- `exemples/` : du TypeScript et du Go **écrits à la main** pour illustrer les stratégies (pas de sortie brute du transpileur), exécutables, avec des benchmarks quand une décision dépend de la performance.

## Découpage

Les exercices 01 à 10 ne sont pas 10 problèmes indépendants : chacun réutilise les précédents. Nous avons donc découpé par **problème de traduction**, et non par exercice.

| # | Problématique | Question centrale | Projets |
|---|---|---|---|
| [01](01-nombres-et-ordre-evaluation/) | Nombres et ordre d'évaluation | Comment garantir le même résultat numérique et le même ordre des effets ? | 01, tous |
| [02](02-unions-etiquetees/) | Unions étiquetées | Comment représenter `A \| B` en Go sans `any` ? | 01, 04 |
| [03](03-fonctions-en-valeur-et-pipe/) | Fonctions en valeur et `pipe` | Comment passer une fonction générique et composer sans runtime dynamique ? | 02, 03, 05 |
| [04](04-expressions-sans-equivalent-go/) | Expressions sans équivalent Go | Ternaire, court-circuit, déstructuration : comment traduire une expression qui devient une instruction ? | 06, 08 |
| [05](05-erreurs-identifiees/) | Erreurs identifiées | Comment garder l'information et le contexte d'un échec, puis le traiter par information ? | 06, 07 |
| [06](06-composition-either/) | Composition d'`Either` | `whenIsRight`, `whenIsRightOtherwise`, `rightPipe` : comment s'arrêter au premier échec ? | 02, 03, 05, 07 |
| [07](07-collections-tuples-et-tableaux/) | Collections | Tuples, tableaux, `map` : comment garder cardinalité, position et performance ? | 05, 08 |
| [08](08-agregation-group/) | Agrégation `group` | Comment réunir N résultats en une transaction sans supposer la forme du conteneur ? | 09, 10 |
| [09](09-asynchronisme/) | Asynchronisme | `async` / `await` sans `Promise` en Go : quand l'aplatissement est-il juste ? | 10 |
| [10](10-affichage-fidele/) | Affichage fidèle | Comment reproduire `util.inspect` et `Number::toString` octet par octet ? | tous |
| [11](11-objets-et-proprietes/) | Objets et propriétés *(vision)* | Comment lire `user.name` sur une union ou un `any`, et partager un objet comme JavaScript ? | aucun |

Ordre de lecture conseillé : 01 → 02 → 03 (fondations), puis les autres dans n'importe quel ordre.

## Principes transverses

Ces principes sont ressortis au fil des problématiques et guident toutes les décisions :

1. **Exploiter le checker TypeScript au lieu de refaire son travail à l'exécution.** `isRight`, `coalescing`, `matchInformation`, `print` ou `pipe` sont résolus à la compilation. À l'exécution, il ne reste que des tests d'entiers et des appels directs.
2. **Ni `any`, ni `reflect`, ni cast pour contourner le typage.** Les premières versions de `pipe`, `map` et `rightPipe` en utilisaient. Elles ont été remplacées : ≈ 10× plus rapide et des erreurs détectées par le compilateur Go (problématique 03).
3. **Ordre d'évaluation explicite** : toute sous-expression non triviale reçoit un nom (contrat `{ before, result }`, problématique 01). C'est ce qui permet d'ajouter ternaire, court-circuit et pipes sans casser le reste.
4. **Décider à partir du type, jamais de l'exemple.** Plusieurs premières versions passaient l'exemple « par hasard » (type commun dans `whenIsRightOtherwise`, slice dans `group`) et échouaient sur le projet suivant (problématiques 06 et 08).
5. **Refuser plutôt qu'approximer** : une construction non prise en charge produit une erreur explicite (`function-value-without-expected-type`…), jamais du Go faux qui compile.
6. **Prouver l'équivalence** : la sortie de chaque projet est identique octet par octet à celle de `tsx`. Nous ajoutons des variantes absentes des exemples, un test différentiel aléatoire (problématique 10) et, à la demande de l'encadrant, un test de transpilation globale (`projects/11`) qui combine les constructions dans un vrai programme.
7. **Un Go lisible** : variables et paquets nommés selon leur rôle (`callee`, `argument`, `checkedResult`, `add_ts`), runtime partagé limité aux fonctions utilisées.

## Mesures (benchmarks)

Machine : Intel i7-1165G7, Windows 11, Go 1.27. Reproduction : `cd problematiques/analyse-detaillee && go test -bench . -benchmem ./...`

| Décision | Retenu | Écarté | Gain |
|---|---|---|---|
| Union (02) | struct étiquetée : 0 alloc | interface : 1 alloc/résultat | **≈ 8×** à la création, égal en lecture |
| `pipe` (03) | appels directs | `any` + `reflect` | **≈ 10×**, 2 allocs contre 7 |
| Échecs (05) | union + `matchInformation` | `(T, error)` | **≈ 3,5×** |
| Tuples (07) | `[N]T` : 1 alloc | `[]T` : 1 001 allocs | **≈ 6×** |
| `map` (07) | allocation unique | `append` successifs | **≈ 2,5×** |
| Retours (02 § 6) | union étiquetée : 0 alloc | `any` + assertion : 1 alloc | **≈ 3×** quand la fonction est appelée par variable ; égalité si Go la met en ligne |
| `rightPipe` (06) | fonction anonyme | — | inlinée par le compilateur (vérifié avec `-gcflags=-m`) |
| `Number::toString` (10) | réimplémentation ECMAScript | `fmt` / `strconv` | **0 différence** sur ~200 000 valeurs aléatoires |

Nous avons aussi gardé les résultats défavorables : la lecture d'une union n'est **pas** plus rapide qu'un switch de type (02).

## Exécuter les exemples

```bash
# TypeScript (depuis la racine du dépôt)
pnpm exec tsx problematiques/analyse-detaillee/<dossier>/exemples/exemple.ts
pnpm exec tsc -p problematiques/analyse-detaillee/tsconfig.json   # vérification des types

# Go (depuis problematiques/analyse-detaillee/)
cd problematiques/analyse-detaillee
go run ./<dossier>/exemples
go vet ./...
go test -bench . -benchmem ./...
```

## Organisation de l'équipe

- **Découpage du travail par exercice**, sur des branches dédiées (par exemple `exo-01-08-09`), fusionnées régulièrement dans `main`. Les conflits ont été résolus en gardant la version qui produisait les sorties attendues pour **tous** les projets déjà résolus.
- **Non-régression** : à chaque fusion, les projets précédents sont relancés et comparés à `tsx`.
- **Documentation continue** : un README par projet (problématique, solution, résultats, limites), rédigé avec le code. Ce dossier en est la synthèse transverse.
- **Commits conventionnels** (`feat`, `fix`, `refactor`, `docs`), avec un message qui explique le *pourquoi*.
- **Revue et refactor communs** en fin de projet : suppression des `any`, des boucles natives et des `Promise.resolve` au profit de l'API DuploJS, et noms explicites dans le Go généré.
