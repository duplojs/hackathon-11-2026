# Problématique 01 — Représentation des Unions de Types et Discrimination Statique

## 1. Énoncé du Problème
En TypeScript et particulièrement dans l'écosystème monadique de **DuploJS**, le type union (`A | B`) est omniprésent pour représenter les résultats d'opérations :
```typescript
type Result = DEither.Success<number> | DEither.Fail;
```
Le langage Go est un langage à typage statique nominal qui **ne possède pas de concept de type union nativement**. 
Le défi d'ingénierie consiste à :
1. Représenter fidèlement en Go une union arbitraire de $N$ types hétérogènes.
2. Préserver l'allocation sur la pile (*Stack*) sans obliger Go à allouer de la mémoire dynamique sur le tas (*Heap*).
3. Permettre de discriminer la variante active (ex: `isRight(result)`) en temps constant $O(1)$, sans utiliser la réflexion dynamique (`reflect.TypeOf`) qui détruit les performances d'exécution.

---

## 2. Synthèse de la Stratégie Adoptée
* **Structure `UnionN` Générique :** Une structure de données compacte contenant un discriminant entier (`Tag uint8`) et des champs dédiés (`V0`, `V1`, ... `Vn-1`).
* **Ordre Canonique Strict :** Les types membres sont triés à la compilation selon leur signature textuelle normalisée pour garantir l'équivalence sémantique (`Fail | Success` $\equiv$ `Success | Fail`).
* **Test de Registre Processeur Direct :** Tout garde de type (`DEither.isRight`, `isLeft`) se traduit en Go par un simple test d'égalité entière : `result.Tag == 1`.

---

## 3. Documents Inclus
* [`historique-reflexions.md`](./historique-reflexions.md) : Pistes explorées, limites de la V1 et justification du modèle d'UnionN.
* [`exemples/duplojs.ts`](./exemples/duplojs.ts) : Exemple TypeScript/DuploJS retravaillé manuellement.
* [`exemples/go_equivalent.go`](./exemples/go_equivalent.go) : Exemple Go idiomatique équivalent sans bruit.
