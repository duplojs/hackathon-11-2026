# Hackathon DuploJS — rendu d’équipe

## Membres de l’équipe

| | Nom | Prénom | Classe |
|---|---|---|---|
| 1 | Nasraoui | Aziz | 5IWJ |
| 2 | Vanderlynden | Louis-Martin | 5IWJ |
| 3 | Ratiaray | Lucas | 5IWJ |

## Objectif

Étudier s’il est possible de transpiler du DuploJS vers Go pour obtenir un programme performant tout en conservant le comportement d’origine. Les dix exercices se trouvent dans `projects/01` à `projects/10`. Le projet `projects/00` présente une solution et sert de point de départ.

## Rendu par problématique

**Le cœur du rendu est le dossier [`problematiques/`](problematiques/)** : un dossier par problématique étudiée (12, plus des benchmarks en bonus). Chacun contient un court README, l’historique de nos réflexions (pistes explorées, choix et justifications) et des exemples TypeScript / Go écrits à la main, vérifiés pour afficher la même chose. Le [README du dossier](problematiques/README.md) donne le découpage, la correspondance avec les exercices et l’organisation de l’équipe.

Les sections ci-dessous résument les stratégies et l’état de chaque exercice ; les README de `projects/XX/` montrent le Go réellement généré.

## Démarche

1. **Un skill d’équipe** ([`.agents/skills/duplojs-go-strategies/SKILL.md`](.agents/skills/duplojs-go-strategies/SKILL.md)) rassemble nos règles de traduction. Chaque règle est marquée *Proposé* ou *Décidé* et porte sa justification. Il complète les skills fournis (`typescript-to-go`, `go-ast`, `go-printer`), qui décrivent l’architecture du transpileur. Le skill est mis à jour à chaque décision, avant le code.
2. **Pour chaque exercice** : lire la problématique, exécuter la référence Node (`tsx`), analyser les variations de chaque construction, implémenter des transformers génériques (un routeur par domaine DuploJS, un handler par opération), puis comparer la sortie Go à celle de Node.
3. **Le comportement d’abord** : un résultat n’est noté « vérifié » que si le Go compile, passe `go vet` et produit la même sortie que Node. Les observations de performance non mesurées sont signalées comme telles.

## Stratégies transverses

| Construction | Go produit | Justification |
|---|---|---|
| `number` (et littéraux, nombres brandés `number & DNumber.Positive`) | `float64` | IEEE 754 double précision, comme JS. Vérifié : `0.1 + 0.2` donne `0.30000000000000004` des deux côtés. Les contraintes DuploJS n’existent que dans les types. |
| `string` (et littéraux, templates, strings brandés) | `string` | Chaînes immuables des deux côtés. |
| Variante Either (`success`, `fail`, `left`) | un type Go concret par constructeur : `EitherSuccess[T]`, `EitherFail`, `EitherLeft[T]` | Même forme que l’objet JS (marques, information, valeur typée). Tags `json` pour l’affichage. |
| Union de variantes Either | interface `shard_dependencies.Either` (`IsRight()`, `GetInformation()`, `GetValue()`) | Go convertit implicitement une variante vers l’interface, donc chaque `return` compile sans connaître l’union. Le nombre de variantes n’a pas de limite (voir ci-dessous). |
| `isRight(x)` / `matchInformation` | `x.IsRight()` / `switch x.GetInformation()` | Un appel de méthode, un `switch` sur des chaînes : les traductions les plus directes. |
| Ternaire, `&&`, `\|\|` | variable résultat + `if` | Go n’a pas de ternaire. Seule la branche nécessaire est évaluée : le court-circuit de JS est conservé. |
| Fonction fléchée | littéral de fonction Go | Types des paramètres et du retour lus dans le checker TypeScript. |
| `DCommon.print` | `shard_dependencies.Print` | Chaîne affichée brute. Autre valeur affichée en JSON, identique à `JSON.stringify` (le format `util.inspect` de Node n’est pas reproduit). |
| Appel d’une déclaration de fonction | appel direct | Une déclaration est immuable, donc l’ordre d’évaluation est conservé, et Go infère les génériques. Corrige le projet 00 fourni, qui ne compilait pas. |

## Passage à l’échelle des unions

Une fonction DuploJS réelle peut retourner une union de nombreuses variantes, dont les valeurs ont des types différents. Deux représentations ne tiennent pas à l’échelle :

- **une struct générique à deux paramètres** `Either[R, L]` : elle ne peut pas porter plusieurs variantes Left dont les valeurs sont de types différents ;
- **un type Go généré par combinaison d’union** : le nombre de types croît avec chaque union distincte du programme.

Notre représentation évite ces deux écueils. **Toute union de variantes Either, quels que soient son nombre de membres et les types de leurs valeurs, devient la même interface `Either`.** Le nombre de types Go est fixe : un type par constructeur DuploJS. Il ne dépend ni de la taille du programme ni du nombre de combinaisons.

Vérifié : une fonction qui retourne **5 variantes** (`left("too-short", number)`, `left("forbidden-char", string)`, `fail()`, `left("reserved", boolean)`, `success(string)`) est typée `shard_dependencies.Either`. Un `matchInformation` sur les 5 informations, chacune avec son callback typé, donne une sortie Go identique octet pour octet à celle de Node.

Le coût de cette généralité est documenté : chaque conversion vers l’interface peut allouer sur le tas, et `GetValue()` renvoie `any` (boxing puis assertion `.(T)` à l’exécution). L’alternative sans allocation, une struct plate par union, demanderait de calculer chaque union avec le checker et retomberait dans le problème de la génération par combinaison.

**Unions mixtes (projet 11).** `DEither.unwrapRight` produit une union où une valeur brute côtoie des variantes Either (`string | Left<…> | Error<null>`), puis `if (isLeft(x)) return x;` rétrécit `x` en `string`. En Go, une variable garde son type statique : la variable reste donc un `Either`, et à chaque lecture où le checker a rétréci son type, le transpileur émet `x.GetValue().(string)`. Les variables concernées sont suivies par leur symbole TypeScript.

## Suivi des exercices

| Exercice | Responsable | État | Documentation |
|---|---|---|---|
| 00 (exemple) | Aziz | Correction : le Go fourni ne compilait pas (générique non instancié). Sortie identique à Node | [01/README](projects/01/README.md) |
| 01 — union, `if`, `print` | Aziz | Sortie identique à Node | [projects/01](projects/01/README.md) |
| 02 — fonction en argument | Louis-Martin | Sortie identique à Node | [projects/02](projects/02/README.md) |
| 03 — `pipe` | Louis-Martin | Sortie identique à Node | [projects/03](projects/03/README.md) |
| 04 — `fail`, plusieurs `return` | Aziz, Louis-Martin (`pipe`) | Sortie identique à Node | [projects/04](projects/04/README.md) |
| 05 — `whenIsRightOtherwise`, `map` | Louis-Martin | Sortie identique à Node | [projects/05](projects/05/README.md) |
| 06 — `left`, ternaire, `matchInformation` | Aziz, Louis-Martin (`pipe`) | Sortie identique à Node | [projects/06](projects/06/README.md) |
| 07 — `rightPipe` | Louis-Martin | Sortie identique à Node | [projects/07](projects/07/README.md) |
| 08 — tuples, déstructuration | Louis-Martin | Sortie identique à Node | [projects/08](projects/08/README.md) |
| 09 — `group` | Louis-Martin | Sortie identique à Node | [projects/09](projects/09/README.md) |
| 10 — asynchronisme | Louis-Martin | Sortie identique à Node | [projects/10](projects/10/README.md) |
| 11 — `unwrapRight`, `isLeft`, regex (exemple du cours) | Louis-Martin | Sortie identique à Node | [projects/11](projects/11/README.md) |

« Sortie identique à Node » : le Go compile, passe `go vet`, et sa sortie est identique octet pour octet à celle de Node lorsque Node affiche en JSON (voir Reproduction).

Chaque README d’exercice suit la même structure : problématique, solution (Go réellement produit et justification), variations étudiées, résultats observés, limites.

## Performance et mémoire

Mesures sur une machine (`go test -bench -benchmem`, Go 1.27.4 ; Node 22.19, 5 millions d’appels après chauffe, médiane de 3 runs). À prendre comme un ordre de grandeur.

| Appel de `add` | Node | Go | Allocations Go |
|---|---|---|---|
| Renvoie `Success<number>` (type concret) | 464 ns | 0,49 ns | 0 |
| Renvoie une union, cas succès | 485 ns | 21,5 ns | 1 (32 octets) |
| Renvoie une union, cas `left` | 171 ns | 18,1 ns | 1 (24 octets) |

- La conversion vers l’interface `Either` alloue sur le tas : `go build -gcflags=-m` l’indique (`escapes to heap`). C’est le prix de la représentation choisie ; une struct plate sur les chemins chauds serait la piste d’optimisation.
- `add` est inlinable (`-gcflags=-m=2` : coût 18, seuil 80). Supprimer les variables temporaires inutiles a fait passer ce coût de 33 à 18.
- Les marques `JSNull` et `JSUndefined` sont des structs vides : 0 octet.

## Reproduction

Prérequis : Node 22, pnpm 12, Go ≥ 1.24 (le `go.mod` généré déclare `go 1.27.4`, que Go télécharge au premier lancement).

```sh
pnpm install
pnpm build:01                          # transpile projects/01 vers projects/01/dist
cd projects/01/dist && go vet ./... && go run .
node_modules/.bin/tsx projects/01/index.ts   # sortie de référence Node
pnpm test:types && pnpm test:lint
```

Scripts disponibles : `build:00` à `build:11`.

Pour comparer octet par octet, faire afficher Node en JSON avec un module préchargé qui remplace `console.info` et `console.log` par `JSON.stringify(v, null, 2)` (chaînes affichées brutes), puis `node --import tsx --import ./json-console.mjs projects/XX/index.ts` et `diff` avec la sortie de `go run .`.

Sous Windows, deux contournements **locaux, non versionnés** sont nécessaires :

- Les chemins `DPath` (`/C:/…`) doivent être convertis pour l’API TypeScript (`C:/…`), sinon le build échoue avec `missingProject`. Un patch local est fourni à l’équipe (`git apply windows-paths-fix.patch`).
- `pnpm test:lint` ne fonctionne pas : `tsgolint.js` n’est pas exécutable sous Windows. Lancer le lint sous Linux, macOS ou WSL.

## Rendu

- Faites un fork du boilerplate et ouvrez une pull request vers le dépôt d’origine.
- Remettez une archive ZIP correspondant au travail présenté dans la pull request au moment de la soutenance.
