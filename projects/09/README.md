# Projet 09

## Problématique

### Regrouper des résultats en une transaction

Dans `index.ts`, plusieurs calculs indépendants produisent chacun un résultat `Either`. `DEither.group` doit les réunir pour former un résultat unique : la transaction ne peut être considérée comme réussie que si tous les calculs réussissent. Comment regrouper ces résultats en conservant les valeurs de réussite et en propageant un échec à l’ensemble de la transaction ?

## Solution

Les extraits viennent de `dist/` (préfixes `Sourced_` et chemins de packages raccourcis pour la lecture).

### Regrouper des résultats en une transaction

```go
Generated_4 := make([]float64, len(Generated_3))
var Generated_5 shard_dependencies.Either
Generated_6 := true
for Generated_7, Generated_8 := range Generated_3 {
	if !(Generated_8.IsRight()) {
		Generated_5 = Generated_8
		Generated_6 = false
		break
	}
	Generated_4[Generated_7] = Generated_8.GetValue().(float64)
}
if Generated_6 {
	Generated_5 = shard_dependencies.EitherSuccessOf(Generated_4)
}
transaction := Generated_5
```

`DEither.group(calculations)` est traduit en boucle (`transformers/duplojs/either/group/`), avec la sémantique du runtime DuploJS :

- le slice des valeurs est **alloué une seule fois** à la taille de la collection ;
- au premier résultat qui n’est pas `Right`, la boucle s’arrête (`break`) et cet échec devient le résultat de la transaction ;
- si tous les calculs réussissent, la transaction est un `success` portant le slice des valeurs.

Le `whenIsRightOtherwise` en forme data-first qui suit est déplié en `if/else` (voir projet 05). Le résultat est typé `[]string`.

## Variations étudiées

- Collection dynamique (ce projet : une variable) : boucle `for … range`.
- Tableau littéral de fonctions (`asyncGroup` au projet 10) : déroulé élément par élément, chaque fonction n’étant appelée que si les précédentes ont réussi.

## Résultats observés

Sortie Go identique octet pour octet à celle de Node (affichée en JSON) : `["transaction annulée"]`, car le troisième calcul échoue.

Reproduction :

```sh
pnpm build:09
cd projects/09/dist && go vet ./... && go run .
```

Comparaison avec Node : faire afficher Node en JSON (module préchargé qui remplace `console.info` par `JSON.stringify(v, null, 2)`, voir le README racine), puis `diff` avec la sortie de `go run .`.

## Limites

- Les valeurs sont lues avec `GetValue().(float64)` : une assertion à l’exécution par élément.
- La forme objet de `group` (`group({ a: …, b: … })`, qui existe dans le runtime) n’est pas couverte par un projet.
