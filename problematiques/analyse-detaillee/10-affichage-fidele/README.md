# 10 · Affichage fidèle : `DCommon.print` et `DString.to`

**Projets concernés** : tous (le critère de réussite est une sortie identique **octet par octet** à celle de `tsx`).

## Problématique

`DCommon.print` appelle `console.info`, qui formate avec `util.inspect` de Node. `DString.to` applique `Number::toString`. Go formate autrement :

| Valeur | Node | Go `fmt` |
|---|---|---|
| `123456789012` | `123456789012` | `1.23456789012e+11` |
| `1.5e-7` | `1.5e-7` | `1.5e-07` |
| `0.000001` | `0.000001` | `1e-06` |
| `2 ** 53` | `9007199254740992` | `9.007199254740992e+15` |
| `["3"]` | `[ '3' ]` | `[3]` |
| Success | `{ '@duplojs/…/right': null, … }` sur une ou plusieurs lignes | `{{} 3}` |

Comment reproduire **exactement** ce format, sans réflexion à l'exécution ?

## Stratégie retenue

1. **`Number::toString` réimplémenté** : chiffres les plus courts via `strconv.FormatFloat(x, 'e', -1, 64)` (même critère « aller-retour exact » que JavaScript), puis règles de mise en forme ECMAScript (décimal jusqu'à 10²¹, exponentiel en dessous de 10⁻⁶).
2. **Inspecteurs choisis à la compilation** d'après le type statique : `InspectSlice(InspectString)`, `InspectUnion2(…)`, `InspectEitherSuccess(InspectNumber)`. Seuls les inspecteurs réellement utilisés sont émis.
3. **Règles de Node reproduites** : chaîne de premier niveau sans guillemets, guillemets simples et échappements à l'intérieur des structures, `-0`, passage à la ligne au-delà de 80 colonnes (`reduceToSingleString`).

## Exemple et validation

```bash
pnpm exec tsx problematiques/analyse-detaillee/10-affichage-fidele/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./10-affichage-fidele/exemples
```

**Test différentiel** (200 000 `float64` aléatoires, toutes magnitudes, sous-normales comprises) :

```bash
cd problematiques/analyse-detaillee
go run ./10-affichage-fidele/exemples differential samples.txt
pnpm exec tsx 10-affichage-fidele/exemples/compare.ts samples.txt
# 199953 valeurs comparées, 0 différence(s)
```

Voir [HISTORIQUE.md](HISTORIQUE.md).
