# Hackathon DuploJS → Go — règles du projet

> Équipe : relisez la section « Décisions » avant de lancer l'agent. Ce sont des propositions :
> si vous en changez une, modifiez-la ICI, sinon l'agent suivra l'ancienne.

## Contexte

Ce dépôt est un transpileur : il lit du TypeScript écrit avec DuploJS (`@duplojs/lang`) et génère
du Go. Le sujet demande d'étudier si un programme DuploJS peut être exécuté en Go **sans changer
son comportement** et en tirant parti des performances de Go (temps d'exécution, mémoire).

- Les exercices sont dans `projects/00` à `projects/10` (`README.md`, `add.ts`, parfois `divide.ts`, `index.ts`).
- Un exercice est réussi quand la sortie du Go généré est **identique** à la sortie TypeScript.
- Une limite bien expliquée compte dans la note : ne jamais masquer un cas non géré.

Lis aussi `AGENTS.md` (conventions DuploJS) et les skills de `.agents/skills/`, en particulier
`go-ast` et `go-printer`.

## Commandes

```bash
pnpm install
pnpm build:01                         # transpile projects/01 vers projects/01/dist
cd projects/01/dist && go run .       # lance le Go généré (go.mod demande Go 1.27.4)
pnpm exec tsx --tsconfig projects/01/tsconfig.json projects/01/index.ts   # sortie de référence TS
./scripts/compare.sh 01               # tout d'un coup : build + go run + comparaison avec TS
```

Les scripts `build:02` à `build:10` doivent exister dans `package.json` (même modèle que `build:01`).

## Architecture (ce qu'il faut savoir)

- Tout le travail se fait dans `src/transpiler/transformers/`. Ne jamais modifier le printer
  (`src/go/printer/`) ni la lecture TS, sauf bug avéré et documenté.
- Dossiers : `declaration/`, `statement/`, `expression/`, `type/`, `shared/`, `duplojs/`.
  Chacun a un `index.ts` avec une liste de transformers essayés **dans l'ordre**. Le premier qui
  ne répond pas `context.notSupport()` gagne. Ajouter une fonctionnalité = un fichier + une ligne
  dans la bonne liste.
- Un transformer d'expression rend `{ before, result }` : `before` = instructions Go à exécuter
  avant, `result` = l'expression Go finale. C'est le mécanisme à utiliser pour tout ce qui n'est
  pas une expression en Go (ternaire, déstructuration, pipe aplati…).
- `context.generateIdentifier()` crée une variable temporaire `Generated_N`.
- `context.createSourceIdentifier(nom)` crée l'identifiant Go d'un nom TS (`Sourced_nom`).
- `context.registerSharedDependency(dep)` ajoute du code Go commun dans `shard_dependencies`.
- `context.resolveReferenceModule(...)` sert à savoir si un identifiant vient de `@duplojs/lang`.
- Les fonctions DuploJS sont reconnues dans `transformers/duplojs/` (voir `either/success`
  comme modèle).
- Les instructions TS au niveau du fichier (hors déclarations) vont dans le `func init()` Go.

## Décisions (à valider par l'équipe)

1. **Either** : un struct unique passé par valeur, pas d'interface. *(validé le 18/11, champ `Kind` ajouté)*
   ```go
   type Either[L any, R any] struct {
       IsRight     bool
       Information string
       Kind        string // "" pour left()/right(), sinon "success", "fail", "ok", "error"…
       Left        L
       Right       R
   }
   ```
   `Kind` est nécessaire pour une sortie identique : `DEither.success(3)` affiche une clé
   `success: null` que `DEither.right("success", 3)` n'a pas (idem fail, ok, error, none, some, result).
   « Pas de valeur » (`DEither.fail()`, ou aucun cas Left/Right dans le type) : `shard_dependencies.JSUndefined`
   (0 octet comme `struct{}`, et `Print` sait afficher `undefined`). *(validé le 18/11)*
2. **Information** : `string` (les constantes entières sont une optimisation à documenter, pas à faire).
3. **Nombres** : `number` → `float64`, toujours.
4. **Sortie** : la fonction Go `Print` imite le format de `console.log` de Node pour les types
   manipulés (nombres, strings, tableaux, objets Either). Objectif : sortie identique caractère
   par caractère.
5. **Fonctions passées en argument** (`whenIsRight`, `rightPipe`, `map`, `pipe`…) : générer le
   code **en ligne** (`if r.IsRight { … }`, boucle `for`, étapes séquentielles). Une closure Go
   n'est autorisée qu'en solution de repli, et doit être justifiée dans le README.
6. **Cas non géré** : `context.error(node)`, jamais de `any` silencieux pour faire passer le build.
   Exception documentée *(validée le 19/11)* : une union qui mélange un Either et une valeur qui n'en
   est pas un (ex. résultat de `whenIsRight`, `Fail | readonly [number]`) devient `any`, faute de type
   Go commun (`type/mixedEitherUnion.ts`). Toute autre union inconnue reste une erreur.
8. **Runtime Go écrit à la main** *(validé le 18/11)* : le code Go commun qui n'est pas une traduction
   du TS (type `Either`, constructeurs, `Print`) est écrit dans de vrais fichiers `.go` rangés à côté
   du transformer qui l'utilise (ex. `duplojs/common/print/print.go`), déclarés dans le champ
   `goFiles` de la shared dependency, et copiés tels quels dans `shard_dependencies/` par `build.ts`.
   Le code traduit depuis le TS passe toujours par l'AST Go. Raison : `Print` fait ~300 lignes,
   illisibles en factories GoAST ; en `.go` il reste lisible et testable contre Node
   (`brouillons/print-test/run.sh`). Seule exception à « tout dans `transformers/` » :
   le champ `goFiles` (`sharedDependency/base.ts`) et sa copie (`build.ts`).
7. **Fini** = le build passe + sortie identique + les exercices déjà validés passent toujours
   + la section README de l'exercice est écrite.

## Méthode de travail obligatoire

Pour chaque exercice ou fonctionnalité :

1. Lire le `README.md` de l'exercice et lancer la version TS pour noter la sortie attendue.
2. Repérer ce qui est nouveau par rapport à l'exercice précédent.
3. **Écrire d'abord le Go attendu à la main** dans un fichier brouillon (hors `projects/*/dist`),
   le faire compiler et tourner, vérifier la sortie. Me le montrer avant d'écrire le transformer.
4. Implémenter le ou les transformers qui génèrent ce Go.
5. `./scripts/compare.sh NN` sur l'exercice ET sur tous les exercices déjà validés.
6. Proposer le texte de la section README (modèle ci-dessous).
7. Ne pas faire plusieurs exercices d'un coup : s'arrêter après chacun et me faire un résumé.

Si un point bloque plus de quelques tentatives : s'arrêter, expliquer pourquoi, proposer de le
documenter comme limite.

## Modèle de section README par exercice

```markdown
### Exercice NN

**Problèmes étudiés** : …
**Solution** : (extrait court du Go généré et pourquoi cette forme)
**Variations envisagées** : …
**Résultat observé** : sortie Go identique à la sortie TS (oui/non), commande pour reproduire.
**Limites** : …
**À vérifier** : ce qui est supposé mais pas mesuré.
```

## État actuel

*(mis à jour le 18/11)*

- **Projet 00 : validé** (`./scripts/compare.sh 00`). Go 1.27.4 refusait aussi
  `Generated_4 := shard_dependencies.EitherSuccessOf` : corrigé en instanciant la fonction
  générique (`EitherSuccessOf[shard_dependencies.JSUndefined, float64]`) dans le handler `success`.
- **Projet 01 : validé** (`./scripts/compare.sh 01`). Ajoutés : `statement/if.ts`,
  `statement/variable.ts` (enregistré), `type/parenthesized.ts`, routeur `duplojs/common` (`print`),
  handlers `either/isRight` et `either/eitherType` (types `Success`, `Fail` et leurs unions),
  runtime `either.go`, `success.go`, `print.go` (décision n°8). Section README écrite.
- **Projet 04 : partie Either validée** (`brouillons/variations-04`, sortie identique). Ajoutés :
  handler commun `either/constructor` (`success` et `fail`), runtime `fail/fail.go`,
  `expression/prefixUnary.ts` (`-x`, toujours appliqué à une variable à cause de `-0`).
  `compare.sh 04` attend `pipe` et `whenIsRight` (exercices 02-03, autre chantier).
- **Projet 06 : partie Either validée** (`brouillons/variations-06`, sortie identique). Ajoutés :
  constructeur `left` (`left/left.go`), `Left<info, valeur>` dans la table des types,
  `either/matchInformation` (switch en ligne), `expression/conditional.ts` (ternaire),
  `expression/logical.ts` (`||` et `&&` avec court-circuit, retirés de `binary.ts`),
  `expression/stringLiteral.ts`, `type/string.ts`, `type/boolean.ts`, `type/ofExpression.ts`
  (type Go d'une expression via le checker), `common/assignment.ts`.
  `compare.sh 06` attend `pipe`, `whenIsRightOtherwise`, `DArray.map`, `DString.to` (02 à 05).
- **Projet 07 : partie Either validée** (`brouillons/variations-07`, sortie identique). Ajoutés :
  `either/rightPipe` (un `if` par étape sur une variable accumulateur ; tous les Either de la
  chaîne doivent avoir le même type Go), `type/numberLiteral.ts` (`0` -> `float64`),
  **`common/inlineCallback.ts`** : recopie en ligne une fonction passée en argument (`(x) => …`
  ou nom de fonction). À réutiliser pour `whenIsRight`, `whenIsRightOtherwise`, `DArray.map`.
  `compare.sh 07` attend `pipe`, `whenIsRightOtherwise`, `DArray.map`, `DString.to` (02 à 05).
- Limites connues : voir les sections « Exercice 01 », « 04 », « 06 » et « 07 » des README.
- Répartition : notre binôme fait la gestion des Either des exercices 04, 06 et 07
  (constructeurs, `matchInformation`, `rightPipe`), plus le TS de base de leurs fichiers
  (`-1`, ternaire, chaînes, type littéral `0`).
- Prochaine étape : notre partie (04, 06, 07) est faite. Attendre les chantiers 02 à 05 pour
  valider `compare.sh 04`, `06` et `07` en entier.
