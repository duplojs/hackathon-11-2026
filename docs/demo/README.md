# Plan B de la démo (sorties enregistrées)

Ce dossier contient les sorties **enregistrées** de la démo de soutenance. On les montre **uniquement** si la démo en direct est impossible : pas de réseau, Docker ou Go indisponibles, machine de remplacement, temps perdu.

| Fichier | Commande enregistrée | Ce qu'on montre |
|---|---|---|
| `check-all.txt` | `./scripts/check-all.sh` | le tableau des exercices 00 à 10 et le total (x/11) |
| `variations.txt` | `./scripts/check-all.sh --variations` | les variantes, dont les deux limites assumées (`03-curried-stored`, `10-sync-between`) |
| `check-09.txt` | `./scripts/check.sh 09` | le détail d'un exercice : TS, transpilation, `go vet`, `go run`, diff vide |
| `check-10.txt` | `./scripts/check.sh 10` | même chose pour l'exercice asynchrone |

Chaque fichier commence par un en-tête : **hash du commit**, date, machine et commande, avec son code de sortie. Ce hash doit être celui du commit livré, c'est-à-dire la tête de la PR et le ZIP.

## Quand produire ces fichiers

**Après le gel du code (J3, 20:00), sur le commit livré**, avec un arbre de travail propre :

```bash
./scripts/record-demo.sh          # écrit docs/demo/*.txt
git add docs/demo && git commit -S -s -m "docs: record offline demo outputs"
```

Le script refuse de s'exécuter si des fichiers suivis ont des modifications non commitées. Un enregistrement fait sur un autre commit que celui livré est interdit : il montrerait des résultats qui ne sont pas ceux remis au jury. Si du code est modifié après l'enregistrement (correctif d'une régression), on relance le script.

**Remarque :** le commit qui ajoute les sorties suit le commit enregistré. Il ne touche que `docs/demo/`, donc le code livré est bien celui de l'en-tête.

## Pendant la soutenance

1. Tenter d'abord la démo en direct (`./scripts/check-all.sh`, puis `./scripts/check.sh 09`).
2. En cas d'échec (plus de 20 secondes perdues), ouvrir `check-all.txt` puis `check-09.txt`, et le dire : « sorties enregistrées sur le commit livré `<hash>`, le jj/mm ».
3. Ne pas improviser une explication de l'échec en direct : revenir à la trame.
