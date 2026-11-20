# 05 · Erreurs identifiées et `matchInformation`

**Projets concernés** : 06, 07, 08, 09.

## Problématique

Avec DuploJS, un échec n'est pas une exception : c'est une **valeur** qui porte un identifiant et un contexte, par exemple `DEither.left("negative-operand", value)`. `DEither.matchInformation` choisit ensuite un traitement par information :

```ts
DEither.matchInformation(result, {
	"negative-operand": (operand) => …,
	"division-by-zero": () => …,
	success: (quotient) => …,
});
```

Comment représenter ces échecs en Go **sans perdre l'information ni le contexte typé**, puis choisir le bon traitement **sans introspection à l'exécution** ?

## Stratégie retenue

- **`Left[T]{ Information string; Value T }`** : l'identifiant devient une valeur, et le contexte garde son type Go.
- **Fusion par représentation** : `Left<"negative-operand", number>` et `Left<"division-by-zero", 0>` ont la même représentation `Left[float64]`. Ils partagent **un seul membre** de l'union (problématique 02).
- **`matchInformation` en deux niveaux** :
  1. l'étiquette de l'union choisit le membre ;
  2. un `switch` sur `Information` n'est généré **que si plusieurs informations partagent ce membre**. Les informations possibles sont lues dans les **types littéraux** à la compilation.
- Un traitement reçoit la valeur seulement s'il déclare un paramètre.

## Exemple et mesure

```bash
pnpm exec tsx problematiques/analyse-detaillee/05-erreurs-identifiees/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./05-erreurs-identifiees/exemples
go test -bench . -benchmem ./05-erreurs-identifiees/exemples
```

Comparaison avec l'idiome Go `(T, error)` + `errors.Is` / `errors.As` ([`alternative_error.go`](exemples/alternative_error.go)), sur 4 appels, construction du message comprise :

| | Union + `matchInformation` (retenu) | `(T, error)` |
|---|---|---|
| Temps | **~215 ns** | ~770 ns (**≈ 3,5× plus lent**) |
| Allocations | 4 (messages uniquement) | 9 |

Voir [HISTORIQUE.md](HISTORIQUE.md).
