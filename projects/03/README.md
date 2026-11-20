# Projet 03

## Problématique

### Composer des transformations dans un pipe

Dans `index.ts`, `result` est transmis à `DCommon.pipe`, puis à `DEither.whenIsRight` configuré avec `DArray.coalescing`. Comment traduire une composition où chaque étape reçoit le résultat de l’étape précédente, en respectant l’ordre du pipe et le comportement conditionnel de la transformation ?

## Solution

Les extraits viennent de `dist/` (préfixes `Sourced_` et chemins de packages raccourcis pour la lecture).

### Composer des transformations dans un pipe

```go
var Generated_1 any
if result.IsRight() {
	Generated_1 = shard_dependencies.ArrayCoalescing(result.GetValue().(float64))
} else {
	Generated_1 = result
}
newResult := Generated_1
```

`DCommon.pipe(result, DEither.whenIsRight(DArray.coalescing))` est **déroulé à la compilation** (`transformers/duplojs/common/pipe/`) : chaque étape reçoit la variable produite par la précédente, dans l’ordre du pipe. Aucun tableau de fonctions ni boucle n’existe à l’exécution.

Une étape curryfiée connue (`whenIsRight(fn)`, `whenIsRightOtherwise(…)`, `DArray.map(fn)`, `DString.test(re)`, `unwrapRight`) est dépliée en place, avec le même code que sa forme data-first (projet 02). Les autres étapes (fonction du projet, fonction fléchée) passent par `callable.ts`, qui les appelle directement.

## Variations étudiées

- Pipe à une étape (ce projet) et à plusieurs étapes (projets 05, 06, 07 : `whenIsRightOtherwise` puis `DArray.map`).
- Étapes curryfiées DuploJS, fonctions du projet et fonctions fléchées.
- L’ordre des étapes est conservé : chaque étape est évaluée une seule fois, après la précédente.

## Résultats observés

Sortie Go identique octet pour octet à celle de Node (affichée en JSON) : l’Either `success` de valeur `3`, puis `[3]`.

Reproduction :

```sh
pnpm build:03
cd projects/03/dist && go vet ./... && go run .
```

Comparaison avec Node : faire afficher Node en JSON (module préchargé qui remplace `console.info` par `JSON.stringify(v, null, 2)`, voir le README racine), puis `diff` avec la sortie de `go run .`.

## Limites

- Comme au projet 02, une étape `whenIsRight` produit une variable `any`.
- Une étape qui n’est ni une opération DuploJS connue ni un appel de fonction (par exemple une valeur calculée dynamiquement) n’est pas prise en charge.
