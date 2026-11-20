# 08 · Agréger des résultats : `DEither.group`

**Projets concernés** : 09, 10 (`asyncGroup`).

## Problématique

`DEither.group(results)` réunit plusieurs `Either` en **une transaction** :

- si **tous** réussissent → `Success` contenant toutes les valeurs, **dans l'ordre** ;
- au **premier** échec → cet échec devient le résultat, et les éléments suivants ne sont pas examinés. Si ce sont des getters `() => either`, ils ne sont même **pas exécutés**.

Le type de la valeur réunie dépend de la **forme** de l'entrée : un tableau donne `number[]`, un tuple donne `[number, number, number]`. La traduction Go doit respecter les deux.

## Stratégie retenue

- **Boucle dans une fonction anonyme appelée immédiatement** : la propagation de l'échec est un simple `return`, comme pour `rightPipe` (problématique 06).
- **Conteneur choisi d'après le type cible**, et non supposé :
  - cible `[]T` (entrée tableau) → `make([]T, 0, len(input))` puis `append`. Une seule allocation, avec une capacité maximale connue ;
  - cible `[N]T` (entrée tuple) → `var values [N]T` sur la pile, affectation par index.
- **Échec recopié tel quel** dans l'union de la transaction : il garde son information et sa valeur.
- **Getters** appelés un par un, dans la boucle, ce qui conserve la paresse de DuploJS (traduit pour `asyncGroup`, projet 10).

## Exemple

```bash
pnpm exec tsx problematiques/analyse-detaillee/08-agregation-group/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./08-agregation-group/exemples
```

Les sorties sont identiques. En particulier, `calcule 8 / 2` n'apparaît jamais, ce qui confirme l'arrêt au premier échec.

Voir [HISTORIQUE.md](HISTORIQUE.md).
