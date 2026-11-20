# Historique des réflexions · 11 Objets et accès aux propriétés

Ce dossier rassemble les pistes discutées avec l’encadrant le 18 novembre et nos vérifications. Rien n’est encore implémenté dans le transpileur.

## 1. Le point de départ : où se joue la performance

L’encadrant a posé le principe suivant : la performance se décide à la **déclaration** des données. Un objet déclaré comme une struct Go est compact et ses champs sont lus directement ; une `map[string]any` coûte une recherche par clé et une allocation par valeur. Renvoyer ensuite cette struct sous forme de `any` ne change pas sa représentation.

Le problème se déplace alors à **l’utilisation** : sur un `any`, Go interdit `value.Name`. Il faut retrouver le type par une assertion.

## 2. Piste A : assertion vers le type exact

```go
name := value.(User).Name
```

L’assertion est peu coûteuse (une comparaison du type à l’exécution) et ne peut pas échouer, puisque TypeScript a déjà validé que la propriété existe.

**Problème** : le transpileur traite un nœud à la fois. Au point d’accès, il faut retrouver le nom du type Go qui a servi à déclarer l’objet, parfois dans un autre fichier ou une autre fonction. Faisable avec le checker, mais complexe ; et impossible quand la valeur peut avoir plusieurs types (`User | Product`).

## 3. Piste B : assertion partielle sur une struct anonyme (vérifiée : impossible)

L’idée : ne vérifier que la partie utile.

```go
value, ok := item.(struct{ Name string })
```

**Vérifié en Go** : `ok` vaut `false` si la struct réelle a d’autres champs (`Name` et `Age`). Go exige un type strictement identique pour une assertion vers une struct. Piste abandonnée.

## 4. Piste C : interfaces avec accesseurs (retenue comme proposition)

Une interface Go est structurelle : une valeur la satisfait dès qu’elle possède les méthodes demandées, quels que soient ses autres champs. Mais une interface ne décrit que des méthodes, pas des champs. D’où l’idée de générer un accesseur par champ :

```go
func (user User) GetName() string { return user.Name }

name := item.(interface{ GetName() string }).GetName() // fonctionne pour User et Product
```

**Vérifié en Go** : l’assertion réussit pour toute struct qui possède `GetName`.

**Choix entre deux formes d’accesseur** :

| Forme | Avantage | Inconvénient |
| --- | --- | --- |
| Un accesseur générique `Get(key string) any` avec un `switch` sur la clé (proposition de l’encadrant) | une seule méthode par struct, gère aussi les clés calculées | comparaison de chaînes à chaque accès, résultat en `any` à réasserter |
| **Un accesseur typé par champ, `GetName() string`** | pas de `switch`, résultat déjà typé ; seuls le nom et le type de la propriété sont nécessaires, et le checker les donne au point d’accès | plus de code généré ; deux structs avec un champ de même nom mais de types différents demandent deux noms d’interface |

Nous proposons l’accesseur typé par champ pour les clés statiques, et le `Get(key)` pour les clés calculées.

**Coût** : un appel par interface (plus lent qu’un accès direct au champ), mais sans allocation si la valeur est déjà dans un `any`, et bien plus rapide qu’une `map[string]any`.

## 5. Piste D : les objets sont partagés par référence

En JavaScript, un objet passé à une fonction n’est pas copié : `rename(user)` modifie l’objet de l’appelant. Une struct Go passée par valeur est copiée, la modification serait perdue.

**Proposition** : utiliser un pointeur (`*User`) dès qu’un objet est modifié après sa création ou partagé, et une struct par valeur pour les objets jamais modifiés (le cas courant avec DuploJS, qui favorise l’immutabilité). Le choix demande une analyse des usages, que le checker rend possible.

## 6. Prochaines étapes

1. Traduire un type objet TypeScript en struct Go, générée une seule fois (comme les unions).
2. Générer les accesseurs typés des champs lus à travers une union ou un `any`.
3. Choisir pointeur ou valeur selon l’analyse des modifications.
4. Ajouter un projet de test global avec des objets, sur le modèle du projet 11 (`projects/11`).
