# 03 — Une sortie identique à `console.log`

**Exercices concernés** : tous (`DCommon.print`). **État** : traité.

## La problématique

Un exercice n'est réussi que si la sortie du Go est **identique, caractère par caractère**, à celle
de Node (décision n°4). `DCommon.print` appelle `console.log`, qui met en forme les valeurs avec
`util.inspect` de Node. Ses règles dépendent de la longueur des lignes, du nombre d'éléments, de
la profondeur et du contenu des chaînes. Aucune fonction standard de Go ne les reproduit.

## Stratégie de l'équipe

Une fonction `Print(value any)` **écrite à la main en Go**
(`src/transpiler/transformers/duplojs/common/print/print.go`), qui reprend l'algorithme de
`util.inspect` de Node :

- une seule ligne si l'objet tient en 80 caractères, sinon une entrée par ligne ;
- tableaux de plus de 6 éléments rangés en colonnes ;
- profondeur 2 au plus ;
- nombres écrits comme en JS (`-0`, `1e+21`, `NaN`) ;
- guillemets choisis comme Node ;
- longueurs comptées en unités UTF-16.

Un Either fournit ses clés et ses valeurs dans l'ordre de Node (`jsEntries`, dans `either.go`).

`Print` reçoit un `any` : c'est la frontière d'affichage, aussi dynamique que `console.log`. Si
`Print` reçoit un type qu'il ne connaît pas, il s'arrête (`panic`) plutôt que d'afficher une
sortie fausse.

Le transpileur ne génère pas ce code : le fichier `.go` est copié tel quel dans
`shard_dependencies/` par `build.ts` (décision n°8). Le Go qui traduit le TS, lui, passe toujours
par l'AST Go.

## Résultat

- `./brouillons/print-test/run.sh` : `Print` comparé à Node sur **136 lignes** de cas limites,
  sorties identiques.
- `./scripts/compare.sh 00` à `07` : sorties identiques.
- `exemples/console-log` : quelques règles de Node, même sortie en TS et en Go (25 lignes).

## Limites

- `Print` ne gère pas la troncature des chaînes de plus de 10 000 caractères (`maxStringLength`),
  ni les surrogates UTF-16 isolés.
- Seuls les types manipulés par les exercices sont gérés : nombres, chaînes, booléens, `null`,
  `undefined`, tableaux, Either.
- La copie de `Print` (~300 lignes, `reflect`) dans tout programme qui affiche quelque chose
  augmente la taille du binaire. Non mesuré.

Voir aussi : [HISTORIQUE.md](HISTORIQUE.md).
