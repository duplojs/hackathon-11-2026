# Historique des Réflexions — Problématique 03 : Tableaux Fixes vs Slices

## 1. Pistes Explorées et Arbitrages Techniques

### Piste A : Tout modéliser en Slices dynamiques `[]T`
* **Idée :** Traiter chaque tuple TypeScript comme une slice Go allouée dynamiquement (`make([]T, len)`).
* **Pourquoi cette piste a été rejetée :**
  1. **Dégradation des performances :** Chaque création de tuple fixe obligerait le runtime Go à réserver de la mémoire sur le tas (*Heap*), déclenchant des cycles réguliers de ramasse-miettes (*GC*).
  2. **Incompatibilité avec les signatures strictes :** Dans des fonctions comme `asyncGroup` (Projet 10), la signature attendue par le reste du programme est strictement typée en `EitherSuccess[[3]float64]`. Émettre une slice `[]float64` fait échouer l'adaptateur d'union `placeValue` car les deux types sont structurellement distincts.
  3. **Violation de l'interdiction de `append` :** En tentant de réutiliser la même logique partout, on se heurte au rejet de Go : `first argument to append must be slice; have [3]float64`.

---

### Piste B : Dupliquer les fonctions de bibliothèque pour chaque taille de tuple
* **Idée :** Écrire `ArrayMap1`, `ArrayMap2`, `ArrayMap3`... spécialisées pour chaque longueur de tableau fixe.
* **Pourquoi cette piste a été rejetée :**
  1. Explosion combinatoire de la taille du code compilé (*code bloat*).
  2. Maintenance impossible : chaque nouvelle fonction de collection (`filter`, `reduce`, `find`) devrait être dupliquée pour chaque taille $N$.

---

### Piste C : Slicing Zéro-Copie (`array[:]`) à l'Émission (Retenue)
* **Idée :** Conserver la représentation la plus optimale pour chaque structure :
  * Les tuples fixes sont déclarés comme des tableaux Go natifs `[N]T` alloués sur la pile (*Stack*).
  * Les combinateurs fonctionnels de collection (`ArrayMap`, `ArrayFilter`) conservent une signature générique unique prenant des slices `[]T`.
  * **La passerelle universelle :** À chaque passage d'argument, le transpileur injecte l'opérateur de slicing Go `array[:]`.
* **Pourquoi ce choix est le plus performant :**
  En Go, l'instruction `array[:]` ne copie pas les octets du tableau. Elle instancie un descripteur de slice de 24 octets sur la pile dont le pointeur sous-jacent référence l'adresse du tableau déjà alloué.
  * **Temps d'exécution :** Immédiat en $O(1)$.
  * **Mémoire consommée :** 0 octet sur le tas.
