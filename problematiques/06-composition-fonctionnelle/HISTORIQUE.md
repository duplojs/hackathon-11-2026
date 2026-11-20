# Historique — composition fonctionnelle

## Point de départ : le runtime

Nous avons lu le code de `@duplojs/lang` :

- `whenIsRight(e, f)` renvoie `f(valeur)` si `e` est un `Right`, **sinon `e` tel quel** ;
- `whenIsRightOtherwise(e, f, g)` renvoie `f(valeur)` ou `g(e)` ;
- `rightPipe(x, f1, f2…)` s’arrête au premier `Left`, et enveloppe dans `success` une étape qui renvoie une valeur brute ;
- la forme (directe ou curryfiée) est choisie selon le nombre d’arguments.

## Pistes explorées

### Piste A — des helpers génériques en Go (écartée)

Écrire `WhenIsRight[T, R](e Either, f func(T) R) any` en shared dependency. Simple à générer, mais chaque étape devient un appel indirect avec une closure, le résultat est typé `any`, et le compilateur Go ne peut pas tout optimiser.

### Piste B — déplier à la compilation (retenue, Louis-Martin)

Le transpileur connaît chaque étape au moment de traduire. Il écrit donc directement le `if` correspondant : pas d’appel indirect pour la composition, et le type de chaque étape est donné par le checker. Les formes directe et curryfiée produisent le même code.

## Ce que nous avons vérifié

- Les projets 02, 03, 05 et 07 donnent la même sortie que Node.
- **En rédigeant la documentation**, nous avons testé un cas absent des exercices : une étape de `rightPipe` qui renvoie une valeur brute (`(value) => value * 10`). DuploJS l’accepte, mais le Go généré **ne compile pas**, car la valeur brute est affectée à une variable `Either`.

## Limites et suite

- Le résultat de `whenIsRight` est typé `any` : c’est soit la valeur transformée, soit l’Either d’origine. Piste : calculer cette union avec le checker.
- Étape de `rightPipe` qui renvoie une valeur brute : l’envelopper avec `EitherSuccessOf` quand le checker indique qu’elle ne renvoie pas un Either.
- Les étapes écrites en fonctions fléchées sont des fonctions anonymes appelées sur place ; leur inlining par Go n’a pas été vérifié.
