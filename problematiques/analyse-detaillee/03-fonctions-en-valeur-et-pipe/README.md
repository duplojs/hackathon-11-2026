# 03 · Fonctions en valeur, curryfication et `pipe`

**Projets concernés** : 02, 03, 05, puis 07 à 10.

## Problématique

Le style DuploJS est fonctionnel :

```ts
DCommon.pipe(3, DArray.coalescing, DArray.map(DString.to));
```

Trois difficultés pour Go :

1. **Fonctions génériques passées sans être appelées** (`DArray.coalescing`, `DString.to`). En Go, une fonction générique **doit être instanciée** avant d'être manipulée comme valeur (`cannot use generic function without instantiation`).
2. **Formes curryfiées** : `DArray.map(fn)` renvoie une fonction qui attend le tableau.
3. **`pipe` à nombre variable d'étapes**, où chaque étape a un type différent.

## Stratégie retenue

- **Instanciation par le type attendu** : le transpileur demande au checker le *type contextuel* de l'argument (`getContextualType`), par exemple `(value: number) => string`, et génère une **fonction littérale Go de ce type exact**.
- **Curryfication** : la forme partielle devient une fermeture Go qui capture la fonction (`ArrayMapWith(fn)`).
- **`pipe` sans runtime** : le nombre d'étapes et leurs types sont connus à la compilation. Le pipe devient une **suite d'appels directs**, avec les étapes évaluées dans l'ordre des arguments.
- **Fermetures** : les variables extérieures (`offset`) sont capturées naturellement par Go.

## Exemple et mesure

```bash
pnpm exec tsx problematiques/analyse-detaillee/03-fonctions-en-valeur-et-pipe/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./03-fonctions-en-valeur-et-pipe/exemples
go test -bench . -benchmem ./03-fonctions-en-valeur-et-pipe/exemples
```

Pipe à deux étapes sur 8 nombres, comparé à la **première version** (pipe dynamique en `any` + appel par `reflect`, [`alternative_reflect.go`](exemples/alternative_reflect.go)) :

| | Pipe statique (retenu) | Pipe `reflect` (V1) |
|---|---|---|
| Temps | **~47 ns** | ~470 ns (**≈ 10× plus lent**) |
| Allocations | 2 (les deux tableaux résultats) | 7 |
| Erreur de type détectée | à la compilation Go | à l'exécution (panique) |

Voir [HISTORIQUE.md](HISTORIQUE.md).
