# Historique — passage à l’échelle des unions

## Origine

Pendant le hackathon, le professeur a mis en garde contre un piège dans lequel plusieurs groupes étaient tombés : une représentation qui fonctionne sur les exercices, avec deux variantes, mais pas sur une union plus large. Pour l’illustrer, il a ajouté un exemple, le **projet 11**, où une seule fonction renvoie trois variantes aux valeurs de types différents. Nous avons vérifié si notre représentation avait ce défaut.

## Approches qui ne passent pas à l’échelle

| Approche | Pourquoi elle casse |
|---|---|
| `type Either[R, L any] struct` | Un seul type `L` pour toutes les erreurs. Avec `left("too-short", 3)` et `left("forbidden-char", "@")` dans la même union, `L` devrait être à la fois `float64` et `string`. |
| Un type Go généré par union | Chaque combinaison de variantes devient un nouveau type. Leur nombre grandit avec le projet, et chaque fonction combinant deux unions en crée une troisième. |

## Notre choix et sa vérification

Avec l’interface (voir `02-representation-either`), le nombre de types Go est fixe : un par constructeur DuploJS (5 aujourd’hui). Toute union, quelle que soit sa taille, a le même type Go : `Either`.

Nous l’avons testé avec une fonction qui renvoie **5 variantes** portant des valeurs `number`, `string`, `boolean` et `undefined`, puis un `matchInformation` sur les 5 informations. La sortie Go était identique octet pour octet à celle de Node.

## Ce que ça coûte

- Une allocation par valeur d’union (voir `benchmarks/`).
- Lire une valeur demande une assertion de type à l’exécution (`GetValue().(float64)`). Le type attendu est connu grâce au checker TypeScript, donc l’assertion ne peut pas échouer sur un programme validé par TypeScript.

## Vision à long terme

Le nombre de types reste constant quand le projet grandit, et ajouter un constructeur DuploJS ne demande qu’une nouvelle struct. Si un benchmark montre qu’une union précise est critique, on peut lui donner une représentation plate, sans changer les autres.
