# Projet 01

## Problématique

### Représenter un retour composé de plusieurs variantes

La fonction `add` déclare un retour qui peut être un `DEither.Success<number>` ou un `DEither.Fail`. Comment représenter en Go un retour qui peut prendre plusieurs formes, tout en conservant le type et la valeur associés à chacune d’elles ? Dans cet exemple, l’implémentation retourne actuellement un succès, mais sa signature annonce également la possibilité d’un échec.

### Traduire une instruction conditionnelle

Dans `index.ts`, l’instruction `if` utilise `DEither.isRight(result)` comme condition et contient un bloc d’instructions à exécuter lorsque cette condition est vraie. Comment traduire une instruction conditionnelle en préservant l’évaluation de sa condition et l’exécution de la bonne branche ?
