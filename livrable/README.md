# Livrable — Transpiler DuploJS vers Go

**Question étudiée** : peut-on exécuter en Go un programme écrit avec DuploJS (`@duplojs/lang`)
**sans changer son comportement**, et en profitant des performances de Go (temps, mémoire) ?

Ce dossier présente le travail de l'équipe tel qu'il est dans le dépôt : les problématiques
étudiées, les choix faits et leurs raisons, et des exemples TS / Go retravaillés à la main.

## État des exercices

| Exercice | Sortie Go identique à la sortie TS | Vérification |
|---|---|---|
| 00 à 07 | **oui** | `./scripts/compare.sh NN` (transpile, lance le Go et le TS, compare) |
| Variations 01 à 07 | **oui** | `./scripts/compare-variation.sh NN` (`brouillons/variations-NN`) |
| 08 à 10 | non traités | le build s'arrête avec une erreur explicite |

## Découpage des problématiques

Chaque problématique est **transversale** : elle apparaît dans plusieurs exercices.

| N° | Problématique | La question | Exercices |
|---|---|---|---|
| [01](01-nombres-et-ordre-evaluation/) | Nombres et ordre d'évaluation | Comment garder l'arithmétique et l'ordre de calcul de JS ? | tous |
| [02](02-representation-either/) | Représenter un Either | Quel type Go pour `Success<number> \| Fail` ? | tous |
| [03](03-affichage-identique/) | Une sortie identique à `console.log` | Comment afficher exactement comme Node ? | tous |
| [04](04-expressions-en-instructions/) | Expressions TS → instructions Go | Ternaire, `\|\|`, `&&`, `else if` sans changer ce qui est calculé | 01, 04, 06, 07 |
| [05](05-fonctions-en-argument/) | Fonctions passées en argument | Closures Go, ou code recopié en ligne ? | 02, 03, 05-07 |
| [06](06-composition-pipe/) | Composer : `pipe`, `rightPipe` | Enchaîner des étapes, s'arrêter au 1er échec | 03-07 |
| [07](07-types-ts-vers-go/) | Types TS → types Go | Unions, littéraux, tuples, marques DuploJS : quel type Go ? | tous |

## Contenu d'un dossier

- `README.md` : la problématique, la stratégie de l'équipe avec un extrait de Go, le résultat et
  les limites.
- `HISTORIQUE.md` : les pistes explorées, les choix et leurs raisons, datés, avec les bugs
  trouvés en route.
- `exemples/` : un `index.ts` (référence TypeScript) et un `main.go` **écrit à la main** (noms
  lisibles, commentaires) qui suit la même stratégie que le Go généré. Ce n'est pas une copie de
  la sortie du transpileur.

Les exemples Go utilisent `duplo/`, une copie du runtime Go écrit à la main par l'équipe
(`src/transpiler/transformers/duplojs/…` : `Either`, constructeurs, `Print`, `StringTo`,
`Coalescing`). Seul le nom du paquet change.

## Vérifier

```bash
pnpm install                       # une fois
./livrable/verifier.sh             # chaque exemple Go écrit à la main contre sa référence TS
./scripts/compare.sh 07            # le transpileur sur un exercice
./scripts/compare-variation.sh 07  # le transpileur sur les variations d'un exercice
./brouillons/print-test/run.sh     # Print contre Node, 136 lignes (après pnpm build:01)
```

## Les décisions de l'équipe

Elles sont écrites et datées dans les règles de l'équipe (`CLAUDE.md`, section « Décisions »).

1. **Un Either = un struct générique `Either[L, R]` passé par valeur**, avec un champ `Kind` pour
   l'affichage (problématique 02).
2. **`Information` est une `string`** : des constantes entières seraient une optimisation,
   documentée mais pas faite.
3. **`number` → `float64`, toujours** (01).
4. **`Print` reproduit `console.log` caractère par caractère** (03).
5. **Les fonctions passées en argument sont recopiées en ligne.** Une closure seulement en repli,
   justifiée (05, 06).
6. **Un cas non géré est une erreur de build**, jamais un `any` silencieux. Une seule exception,
   documentée : l'union d'un Either et d'une autre valeur (07).
7. **« Fini »** = le build passe, la sortie est identique, les exercices déjà validés passent
   toujours, et la section README est écrite.
8. **Le runtime Go commun est écrit à la main dans de vrais fichiers `.go`**, copiés par le build
   (03).

## Organisation de l'équipe

- **Règles écrites avant le code** (18/11) : un fichier de règles partagé (`CLAUDE.md`) donne le
  contexte, les commandes, les décisions et la méthode. Il sert aussi de consigne à l'agent IA
  utilisé pour coder (autorisé par le sujet).
- **Une méthode identique pour chaque exercice** : (1) lancer le TS et noter la sortie ; (2)
  repérer ce qui est nouveau ; (3) écrire d'abord le Go attendu à la main (`brouillons/NN`) ;
  (4) écrire les transformers ; (5) `compare.sh` sur l'exercice et sur tous ceux déjà validés ;
  (6) écrire la section README.
- **Deux binômes** : l'un sur la gestion des Either (constructeurs, `matchInformation`,
  `rightPipe` : exercices 04, 06, 07), l'autre sur les fonctions et les tableaux (`whenIsRight`,
  `pipe`, `map`, `DString.to` : exercices 02, 03, 05). Un helper commun (`inlineCallback`) fait
  générer le même Go aux deux binômes pour une fonction passée en argument.
- **Une revue le 20/11**, qui a trouvé trois bugs : `coalescing` sur un tableau, un paramètre
  déclaré deux fois dans un `pipe`, `StringTo` qui acceptait n'importe quel type.
- **Des scripts communs** : `compare.sh`, `compare-variation.sh`, `bench-run.sh`,
  `brouillons/print-test/run.sh`.

## Mesures de l'équipe

Détail et commandes dans `brouillons/BENCHMARKS.md`.

| Mesure | Résultat |
|---|---|
| Either typé contre valeur dans un `any` (`brouillons/benchmark-either`) | ~13 ns et 0 allocation, contre ~26 ns et 1 allocation |
| Exemple de l'encadrant (`brouillons/prof/go`) | 0 allocation par appel en typé, contre 2 à 11 en `any` |
| Lancement complet, exercices 05 et 07 (`scripts/bench-run.sh`) | Node ~27-32 ms, Go généré ~1-1,2 ms |

Limite notée par l'équipe : ces programmes sont minuscules, on mesure surtout le démarrage (lancer
V8 contre lancer un binaire), pas la vitesse de calcul.
