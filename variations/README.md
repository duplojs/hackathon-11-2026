# Variantes des exercices

Les exercices officiels (`projects/`) ne couvrent qu'un exemple par problème. Chaque dossier `variations/<XX>-<nom>/` teste une **variation** de l'exercice `XX`, pour vérifier que la stratégie de transformation est générique et pas taillée sur l'exemple.

- Format : `index.ts` (point d'entrée), éventuellement d'autres `.ts`, et `tsconfig.json` identique à celui de `projects/XX`.
- Chaque variante est du TypeScript **valide** (`pnpm exec tsc -p variations/<dossier>/tsconfig.json --noEmit`). Sa sortie avec `tsx` sert de référence.
- Vérifier une variante : `./scripts/check.sh variations/01-alias`.
- Vérifier toutes les variantes d'un exercice : `./scripts/check-all.sh --variations 01` (ou `--variations` seul pour tout vérifier).

## Exercice 01

| Variante | Ce qu'elle vérifie | Responsable |
|---|---|---|
| `01-alias` | Reconnaissance **par symbole** : `import { isRight as ok }`, `import { print as show }`, namespaces `E` et `C` | P3 (handlers), P4 (routeur) |
| `01-else` | `if` / `else` : branche then sur un Either, branche else sur une condition numérique fausse | P2 |
| `01-else-if` | `else if` dont la condition contient un appel avec **effet observable** (`print("évalué")`) : l'appel n'a lieu que si la condition précédente est fausse | P2 |
| `01-union-order` | `DEither.Fail \| DEither.Success<number>` : même type Go que dans l'ordre inverse | P4 |
| `01-is-left` | `DEither.isLeft` sur un succès (faux) et sur un échec (vrai) | P3 |
| `01-local-const` | `const` dans une fonction : déclaration locale `:=` | P2 |
| `01-const-used-by-function` | `const` de premier niveau lue par une fonction du même fichier : variable de package | P2 |
| `01-print-values` | `print` d'un nombre, d'une chaîne, de tableaux, et des nombres limites (`1e21`, `1e-7`, `-0`, `NaN`, `±Infinity`) | P3 |
| `01-fail` | Fonction annotée qui renvoie `DEither.fail()` : affichage d'un `Fail` (`value: undefined`) | P4 (constructeur), P3 (affichage) |

> À noter : `print(-0)` affiche **`-0`** (format `util.inspect`), alors que `DString.to(-0)` renvoie `"0"`. Ce sont deux formatages différents.

## Exercices 02 à 04

| Variante | Ce qu'elle vérifie | Sortie de référence | Responsable |
|---|---|---|---|
| `02-callback-user` | `whenIsRight` avec une fonction utilisateur non générique : résultat nu, non ré-enveloppé | `6` | P3 (whenIsRight), P4 (forme `Plain`) |
| `02-coalescing-array` | `coalescing` sur une valeur déjà tableau : identité | `[ 1, 2 ]` | P2 (coalescing) |
| `02-left-input` | `whenIsRight` sur un `Fail` : entrée renvoyée telle quelle, callback **jamais** appelé (son `print` ne doit pas apparaître) | l'objet `Fail` seul | P3 |
| `02-callback-either` | Callback qui renvoie un Either : pas de ré-enveloppe | `Success(1.5)` | P3, P4 (coercition) |
| `03-pipe-one-step` | `pipe(3, double)` : une étape, fonction utilisateur, valeur nue | `6` | P3 (pipe) |
| `03-pipe-two-steps` | `pipe(3, double, coalescing)`, puis `pipe(add(1, 2), whenIsRight(double), whenIsRight(coalescing))` : le 2e `whenIsRight` reçoit une valeur **nue** (6), qui **n'est pas un Right**, et la renvoie inchangée | `[ 6 ]` puis `6` | P3, P4 (`IsRight()` faux pour `Plain`) |
| `03-curried-stored` | `const step = whenIsRight(coalescing)` stocké puis appelé deux fois : la forme curryfiée doit exister comme valeur Go | `[ 3 ]` puis `[ 7 ]` | P3 (ADR-3, limite attendue) |
| `04-both-branches` | `return` dans le `if` **et** dans le `else`, sans `return` final | l'objet `Fail` | P2 |
| `04-nested-if` | `return` dans un `if` imbriqué, retour inféré | `Fail` puis `Success(3)` | P2 |
| `04-unary` | `-x` sur une variable, `!` sur un booléen, `!==` | `Success(-3)`, `Fail`, `Fail` | P2 |

> `pipe(x)` **sans étape** est accepté à l'exécution, mais **refusé par TypeScript** (`Expected 2-16 arguments, but got 1`). Le cas est hors du TypeScript valide et donc hors périmètre : il est remplacé par `03-pipe-one-step`.

> `03-curried-stored` est une **limite documentée** (Sprint 3) : sans contexte, TypeScript type lui-même `const step = whenIsRight(coalescing)` en `(input: unknown) => unknown`, et l'appel `step(add(1, 2))` en `unknown`. Aucun type Go n'est déductible du checker. Le transpileur échoue avec `function-value-without-instantiated-signature`, sans rien approximer.

## Exercices 05 et 06

| Variante | Ce qu'elle vérifie | Sortie de référence |
|---|---|---|
| `05-otherwise-left-input` | `whenIsRightOtherwise` (forme directe) sur un `Fail` : seule la branche « otherwise » est évaluée, et elle reçoit l'Either **complet** ; le callback Right n'est jamais appelé | `[ -1 ]` |
| `05-map-direct` | `DArray.map` en forme **directe**, avec une fonction fléchée puis avec `DString.to` passé en valeur ; tableau vide typé (`const empty: number[] = []`) | `[ 2, 5, -6 ]`, `[ '1', '2.5', '-3' ]`, `[]` |
| `05-to-values` | `DString.to` (format de `String(n)`) : `-0` donne `0`, `1e21` donne `1e+21`, `1e-7` ; chaîne et booléen | `0`, `1.5`, `1e+21`, `1e-7`, … |
| `05-map-closure` | Fonctions fléchées qui **capturent** une variable extérieure, dont une à corps-bloc avec deux `return`, dans un `pipe` avec `map` curryfié | `[ 0, 12, 13 ]` |
| `06-left-print` | `DEither.left(info, valeur)` : affichage d'un `Left` (sans clé de tag), puis `isLeft` | l'objet `Left`, puis `gauche` |
| `06-match-curried` | `matchInformation` **curryfié** dans un `pipe`, sur un succès puis sur un `Left` porteur d'une valeur ; gabarit de chaîne | `5`, `trop grand : 500` |
| `06-ternary-lazy` | Ternaire : seule la branche choisie est évaluée (effet observable dans les deux branches) | `évalué : oui`, `oui`, `évalué : non`, `non`, `30` |
| `06-short-circuit` | `&&` et `\|\|` court-circuitent (D2) : l'opérande de droite, avec effet observable, n'est évalué que si nécessaire | `a`, `c`, `e`, `f` évalués ; `b` et `d` jamais |

## Exercices 07 à 09

| Variante | Ce qu'elle vérifie | Sortie de référence |
|---|---|---|
| `07-three-steps` | Trois étapes de `rightPipe`; la deuxième renvoie un gauche et la troisième, qui imprime, n'est pas appelée | `Left("second-step", 3)` |
| `07-plain-step` | Deux étapes nues puis enveloppe finale unique en `Success` | `Success(10)` |
| `07-left-input` | Une entrée déjà gauche court-circuite la première callback | `Left("already-stopped", 7)` ; aucun message de callback |
| `07-division` | Division flottante par zéro, y compris le signe | `Infinity`, `-Infinity` |
| `08-const-destructure` | Déstructuration locale `const [a, b] = pair` | `13` |
| `08-unused-binding` | Un paramètre jamais lu n'est pas lié ; un initialiseur à effet est exécuté même si tous ses noms sont inutilisés | `source still evaluated`, `[ 11 ]` |
| `08-empty-inputs` | `map` sur un tableau vide de tuples contextualisé | `[]` |
| `08-top-level-destructure` | Déstructuration au niveau fichier : variables de package | `14` |
| `09-group-all-right` | Tous les calculs réussissent ; les valeurs droites sont groupées | `Success([ 2, 3 ])` |
| `09-group-first-left` | Deux gauches : le premier est renvoyé tel quel | `Left("first", 7)` |
| `09-group-empty` | Groupe vide | `Success([])` |

Ces onze variantes passent `tsc --noEmit`, la transpilation, `go vet`, `go run`
et la comparaison de sortie avec `tsx`.

## Exercice 10

| Variante | Ce qu'elle vérifie | Sortie de référence `tsx` |
|---|---|---|
| `10-group-lazy-stop` | `asyncGroup` appelle les fabriques dans l'ordre et s'arrête au deuxième `Left` ; la troisième fabrique n'est pas appelée | `factory 1`, `factory 2`, puis le `Left("second", 2)` |
| `10-right-async-pipe-left` | `rightAsyncPipe` propage l'entrée gauche et n'appelle aucune étape | `Left("already-stopped", 7)` ; aucun message d'étape |
| `10-async-pipe-plain` | `asyncPipe` compose une valeur nue, une fonction `async` et une étape nue | `16` |
| `10-await-direct` | fonction `async` utilisateur exécutée puis attendue directement | `inside async function`, `42` |
| `10-sync-between` | effet synchrone entre la création de `asyncGroup` et son `await` | `synchronous effect before await`, puis les deux fabriques et `Success([ 1, 2 ])` |

Sorties brutes observées avec `tsx` :

```text
10-group-lazy-stop:
factory 1
factory 2
{
  '@duplojs/lang/kind/@DuplojsLangEither/left': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'second',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 2
}

10-right-async-pipe-left:
{
  '@duplojs/lang/kind/@DuplojsLangEither/left': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'already-stopped',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 7
}

10-async-pipe-plain:
16

10-await-direct:
inside async function
42

10-sync-between:
synchronous effect before await
factory 1
factory 2
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': [ 1, 2 ],
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
```

`10-sync-between` est un écart **attendu et documenté** : JavaScript affiche
l'effet synchrone avant d'exécuter les fabriques, alors que l'option A exécute
les fabriques dans l'appel Go inliné. Cette variante doit rester un échec attendu
de comparaison ; elle ne doit pas être retirée ni « corrigée » en ajoutant des
goroutines ou une file de microtâches.

Le transpileur prend en charge la forme tableau d'`asyncGroup`. La forme objet,
bien qu'acceptée par DuploJS, est refusée explicitement
(`duplojs-either-async-group-only-supports-arrays`).

## 11 : passage à l'échelle (ADR-13)

Ces variantes ne dérivent pas d'un exercice. Elles reproduisent des situations
fréquentes dans un vrai projet, qui bloquaient le transpileur ou produisaient du
Go invalide avant l'ADR-13.

| Variante | Ce qu'elle vérifie |
|---|---|
| `11-import-cycle` | Deux modules qui s'importent mutuellement : un seul package Go ; deux `label` de premier niveau sans conflit ; ordre d'évaluation ES des modules |
| `11-import-alias` | `import { add as plus }` : le Go désigne le nom déclaré (`add`) |
| `11-union-plain` | `string \| number` : union étiquetée, `typeof`, rétrécissement après `typeof`, `===` sur un membre, `print` |
| `11-union-optional` | `number \| undefined` : `return undefined`, `??`, `=== undefined`, `%` |
| `11-union-array` | `(string \| number)[]`, `string \| number \| null` en paramètre, `print` de `[]bool` et `[][]float64` |
| `11-either-left-string` | `left` à valeur `string` et `success` à valeur `number` : `Either2` construit directement |
| `11-either-two-lefts` | Deux `left` de types différents : gauche en union étiquetée ; `matchInformation` lit le bon côté |
| `11-either-pipe-errors` | `rightPipe` entre deux fonctions aux erreurs de types différents |
| `11-void-function` | Fonction sans valeur de retour et `return;` |
| `11-real-orders` | Trois fichiers, alias de type, trois types d'erreur dans un pipeline, `matchInformation`, paramètre `string \| undefined`, `group` |

## 12 : objets, génériques et boucles (ADR-14)

| Variante | Ce qu'elle vérifie |
|---|---|
| `12-object-basic` | `interface` avec propriété optionnelle, littéral `{ name, age }`, spread `{ ...user, email }`, accès `a.b`, objet imbriqué, `.length`, `a[i]` borné (`noUncheckedIndexedAccess`), `??` sur un champ optionnel, `print` d'objets (champ optionnel absent non affiché, `{}`) |
| `12-object-union` | Union discriminée (`shape.kind === "circle"`), champ commun lu sur l'union, rétrécissement vers un membre, `{ name: string } \| { age: number }` avec `"name" in value`, tableau d'objets, `x!` |
| `12-generic-alias` | `type Box<T>`, paramètre par défaut (`Pair<A, B = string>`), `interface Page<T> extends Meta`, `Box<Box<string>>` |
| `12-loops-assign` | `for…of` (avec destructuration d'un tuple hétérogène), `while`, `for` classique, `do…while`, `break`, `continue`, `=`, `+=`, `-=`, `++`, `--`, `let x: number \| undefined;`, réaffectation d'une union, parenthèses, `%` |
