---
name: go-printer
description: Concevoir, implémenter ou modifier le printer de l'AST Go minimaliste, son rendu exhaustif unique sur Node, ses factories par nœud et son contexte récursif. À utiliser pour toute intervention sur src/go/printer/ ou sur la traduction de cet AST en code Go.
---

# Printer de l'AST Go

## Responsabilité et repères

Transformer l'AST en texte source Go, de façon pure et déterministe, à travers
une seule fonction générale de rendu acceptant tous les `Node`. Le printer
traduit la structure de l'AST ; il ne résout pas les noms et ne complète pas
le programme par des choix métier.

Lire les nœuds concernés dans [src/go/AST/](../../../src/go/AST/) et le printer
existant dans [src/go/printer/](../../../src/go/printer/) avant de les modifier.
Appliquer [duplojs-fundamental](../duplojs-fundamental/SKILL.md). Pour faire
évoluer les nœuds ou leurs unions, appliquer aussi [go-ast](../go-ast/SKILL.md).

Consulter les routeurs de documentation indiqués dans `AGENTS.md`, puis les
références pertinentes :

- `DPattern.matchWithTaggedObject` et le concept de discrimination des objets
  par tag pour le dispatch exhaustif.
- `DPrinter.indent`, `render`, `renderLine` et `renderParagraph` pour assembler
  le texte et produire l'indentation.
- Les domaines de manipulation adaptés avant de créer un utilitaire.

## Contrats de nœuds et couverture

Définir et maintenir `Node` dans `src/go/AST/base.ts` comme union explicite
de tous les nœuds concrets de l'AST. Ce fichier importe chaque type de nœud
depuis son module avec des imports de types. Réexporter `Node` par l'index
de l'AST, qui reste dédié aux réexports.

Inclure les nœuds des quatre domaines ainsi que `GoFile`, `Identifier` et
tous les nœuds auxiliaires taggés : champs, membres d'interface, contraintes,
éléments de littéraux composites, clauses, liaisons, etc. Vérifier les
définitions réelles pour couvrir tous les nœuds. `GoFile` et `Identifier`
appartiennent à `Node` même s'ils n'étendent pas `_Node`.

La fonction générale accepte `Node`. Chaque fonction créée par la factory
transforme un seul type de nœud concret appartenant à `Node` ; sa contrainte
générique s'appuie sur `Node`. Ne jamais accepter `_Node`, `_Declaration`,
`_Expression`, `_Statement` ou `_Type` comme substitut à cette union ou à
ses membres concrets. Conserver les paramétrages structurels utiles des
nœuds ; l'interdiction ne vise pas tous les génériques TypeScript.

Les unions grammaticales existantes continuent à contraindre les propriétés
de l'AST. Le printer ne les élargit pas et ne crée pas un dispatcher de rendu
distinct pour chacune.

## Architecture du rendu

Définir une seule boucle de rendu récursive, par exemple `renderNode`, dont
l'entrée est `Node`. Elle utilise `DPattern.matchWithTaggedObject` sur cette
union complète et associe chaque tag à la bonne fonction créée par la
factory. Les branches délèguent le rendu ; elles ne contiennent pas toute
l'implémentation syntaxique. Centraliser ici l'unique dispatch sur les nœuds.

Conserver une entrée `printGoFile` acceptant un `GoFile` pour rendre un
fichier complet. Elle initialise le contexte à la profondeur zéro et délègue
à la fonction générale. Elle n'introduit pas un second mécanisme de dispatch.

Définir une factory commune de fonctions de rendu, par exemple
`createNodePrinter`. Chaque spécialisation transforme un seul type concret
de `Node` en fragment de syntaxe. Déclarer une fonction dédiée via cette
factory pour chaque nœud, y compris le fichier et les nœuds auxiliaires.

Séparer le nœud courant du contexte injecté. Ce contexte fournit :

- la profondeur et l'indentation associée ;
- la fonction générale de rendu exhaustive, réinjectée pour rendre les enfants.

Les renderers utilisent cette fonction du contexte pour tous leurs enfants
nœuds. Ils n'importent pas la fonction générale dans chaque module et ne
reconstituent pas de matchers locaux par famille ou par parent. La factory
préserve le type précis du nœud courant sans cast et raccorde le contexte.

Ne pas ajouter de fallback, de chaîne vide pour un nœud inconnu, de registre
indexé par `string` ou de cast qui masquerait un cas manquant. L'ajout d'un
nœud à `Node` doit rendre le matcher général incomplet au typage jusqu'à
l'ajout de son renderer. Ne pas contourner une dépendance récursive par `any`
ou une initialisation mutable globale ; organiser l'injection pour qu'elle
soit disponible au moment du rendu. Annoter les retours uniquement lorsque
la récursivité l'exige, conformément aux conventions DuploJS.

## Organisation et helpers

Ranger les spécialisations de la factory et leurs renderers dans
`src/go/printer/`, selon le domaine du nœud :

- `declaration/` : déclarations ;
- `statement/` : instructions et structures de contrôle ;
- `expression/` : expressions et littéraux ;
- `type/` : constructions et références de types.

Chaque domaine contient les fonctions créées par la factory pour ses nœuds.
Placer les nœuds transversaux, comme le fichier et l'identifiant, à un endroit
commun cohérent. Garder le contrat de contexte, la factory commune et la
boucle exhaustive dans les modules transversaux du printer. Les dossiers
organisent les renderers ; ils n'introduisent pas de dispatchers de domaine.

Les éléments qui ne sont pas des nœuds, comme les tuples de paramètres ou
les détails d'échappement, utilisent des helpers spécifiques. Ne pas les
ajouter à `Node` ni leur imposer une factory de nœud. Ranger chaque helper
au plus près du renderer ou du domaine qui l'utilise. Extraire un helper
commun seulement lorsque son rôle concerne plusieurs domaines ; éviter de
centraliser tous les helpers dans un module global. Lorsqu'un helper rend
des nœuds contenus dans sa donnée, lui transmettre le contexte nécessaire.

## Contexte, profondeur et syntaxe

Transmettre le contexte explicitement et de façon immuable. Il contient la
profondeur d'indentation ; ajouter seulement les informations syntaxiques
nécessaires, par exemple celles permettant de parenthéser une expression.
Un rendu enfant conserve la profondeur courante ou reçoit une profondeur
augmentée selon son emplacement. Ne pas incrémenter à chaque appel récursif :
une expression imbriquée n'est pas nécessairement un nouveau bloc.

Utiliser `DPrinter.indent(depth)` pour les tabulations. Définir une convention
unique : les fragments en ligne n'ajoutent ni indentation initiale ni saut
de ligne final ; le renderer propriétaire d'une ligne ajoute son indentation
et celui d'une liste assemble les lignes. Pour un bloc, indenter son contenu
au niveau suivant et aligner sa fermeture sur son ouverture. Éviter qu'un
parent et un enfant indentent tous deux la même ligne.

Préserver la structure des expressions avec les parenthèses nécessaires à la
priorité et à l'associativité des opérateurs. Respecter les séparateurs et
échappements Go, les positions de retours à la ligne et les virgules requises
dans les formes multilignes. L'indentation organise le rendu ; la validité Go
dépend aussi de ces règles syntaxiques, notamment de l'insertion automatique
des points-virgules. Le résultat doit être du texte source sans codes ANSI.

En cas de doute syntaxique, vérifier la [spécification Go](https://go.dev/ref/spec).
Ne pas déléguer à `gofmt` la correction d'une syntaxe invalide produite par le
printer.

## Faire évoluer le printer

Pour chaque ajout, suivre les propriétés et enfants du nœud, compléter les
unions concernées si nécessaire, créer ou adapter sa fonction via la factory
et l'ajouter à `Node` dans `src/go/AST/base.ts`. Compléter ensuite le matcher
général avec son renderer rangé dans le bon domaine. Vérifier les appels
récursifs via le contexte et les rendus vides, imbriqués et multilignes
concernés par la modification.

Après une modification TypeScript, exécuter `pnpm test:types` et
`pnpm test:lint`. Ne pas introduire de tests de l'AST, conformément au skill
`go-ast`. Lorsqu'une vérification du rendu est nécessaire, examiner des
sorties représentatives et, si l'outil est disponible, vérifier leur syntaxe
avec `gofmt` ; cela ne prouve pas la validité après résolution des noms.
