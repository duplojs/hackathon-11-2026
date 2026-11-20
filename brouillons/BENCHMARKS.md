# Benchmarks

Deux mesures simples, chacune reproductible avec une commande. Les chiffres viennent d'une seule
machine (Linux, Node 22, Go 1.24) : ce sont des ordres de grandeur, pas des preuves.

## 1. Représentation de l'Either : struct typée ou `any` ?

```bash
cd brouillons/benchmark-either && go test -bench . -benchmem -count 5
```

Créer l'Either de `add(1, 2)` puis lire sa valeur :

| Représentation | Temps | Allocations |
|---|---|---|
| Struct de l'équipe (`Either[L, R]`, valeur typée) | ~13 ns | 0 |
| Valeur rangée dans un champ `any` | ~26 ns | 1 (8 octets) |

Pourquoi : une valeur rangée dans `any` est « emballée » en mémoire (allocation), puis il faut
vérifier son type à l'exécution. Avec la struct typée, rien à emballer, et c'est le compilateur Go
qui vérifie le type.

Limite : micro-benchmark, une seule opération répétée.

## 2. Un lancement complet : Node ou Go généré ?

```bash
./scripts/bench-run.sh 05     # ou 01, 07…
```

Le TS d'origine est bundlé en un seul fichier JS (pour ne pas mesurer la compilation TS), puis
lancé avec Node ; le Go transpilé est compilé en binaire. On vérifie d'abord que les sorties sont
identiques, puis on prend la médiane de 30 lancements.

| Exercice | Node | Go généré | Mémoire max Node | Mémoire max Go |
|---|---|---|---|---|
| 05 | ~27 ms | ~1 ms | ~38 Mo | ~12 Mo |
| 07 | ~32 ms | ~1,2 ms | ~38 Mo | ~12 Mo |

Limite importante : ces programmes sont minuscules. On mesure surtout le **démarrage** (lancer le
moteur JavaScript V8 contre lancer un binaire déjà compilé), pas la vitesse de calcul. Un programme
qui calcule longtemps réduirait l'écart ; on ne l'a pas mesuré.
