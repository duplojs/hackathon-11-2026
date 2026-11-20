# 11 · Objets et accès aux propriétés (vision à long terme)

**Projets concernés** : aucun. Ce dossier prépare la suite du transpileur, à partir des pistes discutées avec l’encadrant le 18 novembre.

## Problématique

Aucun exercice n’utilise d’objet, mais tout programme TypeScript réel en contient. Trois difficultés apparaissent :

```ts
type User = { name: string; age: number };
type Product = { name: string; price: number };

user.name;                              // 1. accès statique : quelle représentation Go ?
function label(item: User | Product) {
	return item.name;                   // 2. propriété commune à plusieurs types d'une union
}
function rename(user: User) {
	user.name = "Ada";                  // 3. un objet JavaScript est partagé par référence
}
```

- Un objet JavaScript peut devenir une struct, un pointeur ou une map en Go (cours 02, slide 6).
- Si une valeur arrive en `any` (piste proposée par l’encadrant pour les retours, voir problématique 02 § 6), Go interdit `value.name` : il faut une assertion de type, donc connaître le type exact.
- En JavaScript, modifier un objet reçu en paramètre modifie l’objet de l’appelant. En Go, une struct passée par valeur est copiée.

## Stratégie proposée (non implémentée)

| Cas | Représentation Go | Accès |
| --- | --- | --- |
| Forme connue, clés statiques | `struct` | direct : `user.Name` |
| Objet modifié ou partagé | pointeur `*User` | direct, la modification est visible par l’appelant |
| Propriété lue sur une union ou sur un `any` | struct + **accesseur généré** par champ | `value.(interface{ GetName() string }).GetName()` |
| Clés calculées (`user[key]`) | `map[string]any` | en dernier recours, avec assertion |

L’accesseur est la seule façon de faire une assertion **partielle** en Go : une interface ne demande que les méthodes qu’elle déclare, quels que soient les autres champs. C’est la piste présentée par l’encadrant le 18 novembre, que nous avons vérifiée en Go.

## Exemple

```bash
pnpm exec tsx problematiques/analyse-detaillee/11-objets-et-proprietes/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./11-objets-et-proprietes/exemples
```

Voir [HISTORIQUE.md](HISTORIQUE.md).
