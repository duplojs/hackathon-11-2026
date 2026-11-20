# Composition fonctionnelle

## Problématique

DuploJS compose les traitements avec des fonctions qui reçoivent des fonctions : `DCommon.pipe`, `DEither.whenIsRight`, `whenIsRightOtherwise` et `rightPipe`. Elles s’écrivent soit en forme directe (`whenIsRight(result, fn)`), soit en forme curryfiée dans un `pipe` (`whenIsRight(fn)`). Comment les traduire en Go sans perdre ni leur sémantique (arrêt au premier échec, échec transmis tel quel) ni la performance ?

## Stratégie retenue

Comme l’appel est connu à la compilation, il est **déplié** en code Go direct :

- `pipe` : les étapes l’une après l’autre ;
- `whenIsRight` / `whenIsRightOtherwise` : un `if/else` sur `IsRight()` ;
- `rightPipe` : des `if` imbriqués qui s’arrêtent au premier `Left`.

Aucune fonction intermédiaire ni closure n’est créée à l’exécution pour la composition elle-même.

## Exercices concernés

02, 03, 04, 05, 07.

## Fichiers

- `HISTORIQUE.md` : helpers génériques écartés, dépliage retenu, et ses limites.
- `exemple.ts` / `exemple.go` : un `rightPipe` suivi d’un `whenIsRightOtherwise` et d’un `map`, en cas de succès et d’échec.
