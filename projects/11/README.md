# Projet 11 — test de transpilation globale

## Problématique

### Vérifier le transpileur sur un programme complet

Les projets 00 à 10 isolent chacun une difficulté précise. Un transpileur peut réussir chaque exercice séparément et échouer dès que ces constructions sont combinées dans un même programme. Comment vérifier que la traduction reste correcte sur du code qui ressemble à un vrai programme, où se mélangent fonctions, unions à plusieurs formes, `pipe`, retours anticipés, expressions régulières et types utilitaires ?

### Le programme testé

`index.ts` reprend l’exemple proposé par l’encadrant : `checkUserName` valide un nom d’utilisateur et renvoie trois issues possibles (`left` si le nom contient un chiffre, `error` s’il contient un `@`, `right` sinon), puis `main` enchaîne la validation, un retour anticipé en cas d’échec et le calcul de la longueur du nom. Le type `_check` vérifie, à la compilation, que le type de retour de `main` est exactement celui attendu.

Deux adaptations ont été faites pour en faire un test exécutable :

- `main` reçoit le nom en paramètre au lieu de `"test"` écrit en dur ;
- `DCommon.print(main(...))` est appelé sur plusieurs entrées, pour que chaque chemin produise une sortie comparable.

## Solution

Dans les extraits, `sd` désigne le paquet `shard_dependencies`.

### Des entrées choisies pour viser chaque chemin et chaque piège

| Entrée | Résultat attendu | Ce qui est vérifié |
| --- | --- | --- |
| `"test"` | succès, `4` | le chemin normal, `pipe`, `unwrapRight`, `length`, `success` |
| `"test1"` | `left` `must-be-not-contain-number` | `DString.test` avec une expression régulière, `left` sans valeur |
| `"te@st"` | `error` | `DString.includes`, `DEither.error`, troisième forme de l’union |
| `"élodie"` | succès, `6` | un caractère accentué compte pour 1, comme en JavaScript |
| `"😀ab"` | succès, `4` | un emoji compte pour 2 (unités UTF-16), comme en JavaScript |
| `"a1@b"` | `left` | les conditions sont évaluées dans l’ordre : le premier `if` l’emporte |
| `""` | succès, `0` | la chaîne vide |

### Ce que le transpileur génère

- **Union à trois formes** : `checkUserName` renvoie `Error<null> | Left<"must-be-not-contain-number", undefined> | Right<"valid-username", string>`, traduit en `sd.Union3[sd.EitherError[sd.JSNull], sd.EitherLeft[sd.JSUndefined], sd.EitherRight[string]]`. Chaque `return` place sa valeur dans le bon membre (`Tag: 0`, `1` ou `2`).
- **Expression régulière compilée une seule fois** : `/[0-9]/` devient une variable de package, compilée au chargement du programme et non à chaque appel.

  ```go
  var compiledPattern1 = regexp.MustCompile("[0-9]")
  // …
  if compiledPattern1.MatchString(username2) {
  ```

- **Longueur fidèle à JavaScript** : en JavaScript, `length` compte des unités UTF-16, alors que `len()` en Go compte des octets (`"é"` vaut 1 en JavaScript et 2 octets en Go). Le helper `StringLength` parcourt les caractères et compte 2 pour ceux qui dépassent le plan de base, comme un emoji.

  ```go
  func StringLength(value string) float64 {
  	length := 0
  	for _, character := range value {
  		length = length + 1
  		if character > 65535 {
  			length = length + 1
  		}
  	}
  	return (float64)(length)
  }
  ```

- **`unwrapRight` dans un `pipe`** : la valeur d’un `Right` est extraite (`V2.Value`), les deux échecs sont conservés tels quels. Le résultat devient `Union3[EitherError, EitherLeft, string]`.
- **Retour anticipé avec rétrécissement** : `if (DEither.isLeft(checkedUsername))` devient `Tag == 0 || Tag == 1`. Après ce test, `checkedUsername` est lu directement comme une chaîne (`Sourced_checkedUsername.V2`).
- **Type utilitaire ignoré** : `type _check` n’existe qu’à la compilation TypeScript et ne produit aucun code Go.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/11/index.ts`, pour les 7 entrées. `tsc --noEmit` valide le programme, y compris le type `_check`. Aucune modification du transpileur n’a été nécessaire : le projet 11 réutilise les traductions ajoutées pour les projets 00 à 10.

Reproduction :

```bash
pnpm exec tsc --noEmit -p projects/11/tsconfig.json
pnpm build:11
(cd projects/11/dist && go run .) > /tmp/go.txt 2>&1
pnpm exec tsx projects/11/index.ts > /tmp/ts.txt
cmp /tmp/go.txt /tmp/ts.txt && echo "identique"
```

## Limites

- **Coût des unions étiquetées** : le `return checkedUsername` de `main` est une ligne en TypeScript. En Go, il produit quatre types d’union différents (`Union3[…, EitherRight[string]]`, `Union3[…, string]`, `Union2[…]`, `Union3[…, EitherSuccess[float64]]`) et trois conversions entre eux. Des retours de fonction en `any`, avec une assertion de type à l’utilisation, rendraient ce code beaucoup plus simple ; la performance dépend surtout de la représentation des données à leur déclaration.
- **Expressions régulières** : la traduction utilise le package Go `regexp`, dont la syntaxe (RE2) ne couvre pas toutes les expressions JavaScript (par exemple les références arrière). Seule `[0-9]` est testée ici.
- **Un seul programme** : ce test couvre les fonctions de l’exemple. Les objets et l’accès à leurs propriétés (`user.name`) ne sont pas testés.
