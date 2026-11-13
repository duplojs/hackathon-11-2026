---
name: typescript-to-go
description: Créer ou modifier le build et les transformers TypeScript vers Go, leurs contextes, les routeurs de domaine, les handlers et les dépendances partagées. À utiliser pour src/transpiler/ et son raccordement au CLI.
---

# Transpiler TypeScript vers Go

## Architecture à préserver

Le transpiler traduit les nœuds TypeScript en AST Go. Le printer rend cet AST et le CLI gère les entrées et sorties. Avant une évolution, lire les appelants et les contrats des couches concernées ; ne pas contourner le typage ou déplacer une responsabilité vers une couche voisine.

Les transformers sont rangés par catégorie de résultat dans `src/transpiler/transformers/` : `declaration/`, `expression/`, `statement/`, `type/`, ainsi que `common/` et `shared/` pour les transformers réutilisables. Chaque fichier `index.ts` de catégorie construit une liste de transformers. Toutes les listes sont déclarées avec `DCommon.memo` et consommées via `.value` afin de ne charger leurs candidats qu'au premier accès et de réutiliser la même liste ensuite.

Les résultats AST Go portent des groupes de tags en plus de leur tag concret. Un transformer peut donc produire un nœud appartenant à plusieurs groupes, par exemple un résultat utilisable à la fois comme expression et instruction, si les contrats de l'AST le permettent. Les contrats `Transformer<GoAST.Expression>`, `Transformer<GoAST.Statement>`, `Transformer<GoAST.Declaration>` et `Transformer<...Type...>` décrivent la catégorie attendue. `transformSourceFile` utilise le groupe `declaration` pour placer un résultat dans les déclarations du package ; les autres résultats rejoignent les instructions de `init`. Vérifier les groupes réels de l'AST avant de choisir un contrat ou une liste.

Les transformers transversaux sont déclarés dans `shared/` puis exposés dans chacune des listes de catégories auxquelles leur résultat appartient. Les listes de domaine DuploJS sont intégrées par catégorie depuis `duplojs/index.ts`. Garder la composition dans les index des listes plutôt que d'aplatir les candidats spécialisés dans la liste de base.

## Domaines DuploJS : routeur puis handler

Chaque domaine DuploJS possède des routeurs spécialisés par catégorie de résultat. Un routeur est le seul point d'entrée vers les handlers du domaine. Il vérifie la forme pertinente du nœud, résout la référence avec `context.resolveReferenceModule`, puis contrôle le module et, si nécessaire, le chemin d'entrée du domaine. Une référence non résolue ou hors domaine retourne `context.notSupport()` avant tout appel à la liste ou au handler spécialisé.

Après résolution, le routeur choisit explicitement le handler correspondant au symbole/export pris en charge. La sélection peut s'appuyer sur `symbol.name` et les informations du `ResolvedModuleReference` (`packageName`, `entry`, `exportName`) ; ne pas inférer l'appartenance au domaine depuis le seul texte d'un identifiant TypeScript. Un symbole du bon domaine mais sans handler connu suit le résultat prévu par le routeur : refus si l'opération n'est pas prise en charge, ou erreur explicite si une forme censée être prise en charge est incohérente.

Les handlers sont des fonctions dédiées, généralement rangées par fonction ou type du domaine dans leur propre dossier. Ils ne sont pas des transformers inscrits dans les listes génériques et ne doivent être appelés que par leur routeur. Le routeur leur transmet le nœud et le contexte après avoir établi l'éligibilité. Le handler s'appuie sur cette preuve : il ne refait pas le routage de la référence et ne renvoie pas le même nœud vers les listes générales. Il traduit directement le cas sélectionné, puis délègue seulement les enfants qui nécessitent leur propre transformation. Cette séparation conserve le typage et les vérifications déjà acquis et rend le mappage symbole-handler explicite.

Appliquer cette organisation aux fonctions et aux types de chaque domaine DuploJS, ainsi qu'aux autres catégories lorsqu'elles sont prises en charge. Pour une nouvelle opération, ajouter le routeur dans la liste de domaine pertinente, puis son handler dans le dossier de l'opération. Les listes restent des `DCommon.memo`.

## Transformers et contrats

Déclarer chaque transformer avec un contrat explicite, par exemple `const numericLiteralTransformer: Transformer<GoAST.FloatLiteral> = createTransformer(...)`. Le générique décrit le nœud Go produit, pas le nœud TypeScript reçu. La factory ne reçoit que l'implémentation ; les gardes TypeScript et les contrôles de prise en charge restent dans celle-ci.

Le contrat explicite sur la constante coupe les cycles d'inférence entre transformers, appels récursifs et registres. Laisser `createTransformer` inférer son générique depuis ce contrat, sans le répéter sur la factory ni annoter le retour du callback. Conserver le générique par défaut `never` et le `NoInfer` sur le résultat. Construire les nœuds Go avec les factories existantes de l'AST.

Chaque transformer porte une opération ou une forme précise : reconnaître son nœud, vérifier qu'il relève de son périmètre de traduction, traduire cette opération et déléguer ses enfants avec `context.transform(node, listeAdaptée)`. Ne pas créer de grand transformer configurable, de transformer universel, ni de helper de factorisation dans `transformers/helpers/` pour quelques répétitions. Si un contrat ou un outil manque, décrire le besoin avant d'étendre une couche partagée.

Pour les API de bibliothèque, résoudre le symbole et vérifier le module, le domaine et l'export. Les alias d'import doivent continuer à résoudre vers le symbole réel. Ne pas reconnaître une API à partir du seul nom textuel de l'appel.

Les résultats suivent les contrats `DEither` exposés par `createTransformer` : `context.success(...)` termine avec un résultat, `context.notSupport()` laisse le dispatch essayer le candidat suivant, et `context.error(...)` produit une erreur terminale. Si tous les candidats refusent, le dispatch retourne `notfound-transformer`. Propager une erreur ou un `notfound-transformer` d'un enfant au lieu de le convertir en simple refus du parent. Vérifier l'éligibilité avant toute mutation des ensembles partagés du contexte : le dispatch ne restaure pas ces ensembles lorsqu'un candidat refuse.

## Validation TypeScript et sens de traduction

Le build et les transformers partent du principe que TypeScript a déjà validé le projet avec sa configuration. Ne pas refaire les contrôles de typage, d'état des variables, de nullabilité ou de compatibilité des opérandes et arguments. Garder les gardes qui identifient les nœuds et les symboles pris en charge, ainsi que les refus dus aux limites réelles de traduction vers Go.

Le checker sert à choisir une représentation ou une sémantique Go, pas à revalider le programme. Par exemple, il peut distinguer une addition numérique d'une concaténation sans exiger une seconde preuve de validité des opérandes. Spécialiser un transformer pour une opération, pas pour les valeurs ou noms d'un exemple ; tenir compte des alias, formes d'arguments et contextes valides de cette opération.

## Composition et résultats `before`

`TransformationSuccessPayload` transporte `result` et `before`. `before` contient les instructions Go nécessaires avant l'évaluation du résultat, dans son contexte d'exécution. Un parent place les préparations de ses enfants ou les transmet jusqu'au parent qui peut les consommer. Préserver l'ordre, la portée, les conditions et la répétition, notamment dans les boucles.

Lors d'un appel, préserver l'évaluation de la fonction puis des arguments dans l'ordre. Si des préparations d'arguments imposent des temporaires, conserver la valeur de chaque expression dans une déclaration locale avant de poursuivre l'évaluation suivante. Lors de la traduction d'un bloc, placer les `before` d'une instruction immédiatement avant son résultat dans le bloc.

Pour ajouter des nœuds au niveau du package, utiliser `context.file.declarations.add(...)` et `context.file.imports.add(...)`. Ces ajouts sont assemblés depuis le contexte du fichier ; ils ne font pas partie de `TransformationSuccessPayload`. Utiliser des références et noms Go cohérents et respecter leur portée.

## Listes et parcours des sources

`sourceFileTransformers` est une liste memo qui rassemble les transformers de déclarations et d'instructions utilisés pour parcourir les statements de la source. `transformSourceFile` les essaie séquentiellement pour chaque statement, ignore les imports TypeScript et classe les résultats par groupe de tags. Une déclaration va dans le package ; un autre résultat et ses `before` vont dans la fonction `init` générée pour le fichier.

Les listes d'expressions, de types, de déclarations et d'instructions sont des mémos distincts. Utiliser `.value` au point d'accès et déléguer à la liste correspondant au résultat enfant attendu. Un transformer `shared` peut être exposé dans plusieurs catégories, à condition que son résultat satisfasse chaque contrat concerné.

## Contextes et build

- `TranspilationContext` conserve le checker, `projectWorkDirectory`, le `Set<SharedDependency>` global et le compteur d'identifiants générés.
- `FileContext`, créé par source, conserve `sourceFile`, `currentFilePath`, `dependencyFiles`, `declarations` et `imports`.
- `BuildContext` relie les deux et expose `transform`, `success`, `notSupport`, `error`, `generateIdentifier`, `createSourceIdentifier`, la résolution des références et l'enregistrement des dépendances.

Créer un contexte de fichier par source, sans recréer le contexte global ou son compteur pour les enfants. Le build part du fichier d'entrée et maintient une file `pending` et un ensemble `built`. Chaque source transformée découvre ses fichiers dépendants ; ceux-ci alimentent la file et un chemin n'est traité qu'une fois. Une erreur de résolution ou de transformation arrête le build et remonte au consommateur.

Le build émet les sources, éventuellement le fichier de dépendances partagées, puis `main.go` et `go.mod`. Les sources sont placées selon leur chemin relatif au `tsconfig` (par exemple `index.ts/index.ts.go`). `createFile` assemble un package et ajoute sa fonction `init`; `main.go` est assemblé séparément.

Repères principaux :

- `bin/index.ts` : options CLI et écriture des fichiers.
- `src/transpiler/createTypescriptInstance.ts` : ouverture du projet TypeScript et `projectWorkDirectory`.
- `src/transpiler/build.ts` : parcours des dépendances, émission des sources et assemblage des dépendances partagées par défaut.
- `src/transpiler/transformSourceFile.ts` et `src/transpiler/createFile.ts` : transformation et assemblage d'un fichier.
- `src/transpiler/createTransformer.ts` : contrat des transformers, dispatch et résultats.
- `src/transpiler/context/` : contextes global, fichier et build.
- `src/transpiler/resolvedReference.ts` : résolution des références aux fichiers du projet et aux modules.
- `src/transpiler/sharedDependency/` : contrat, package et dépendances par défaut.
- `src/transpiler/transformers/` : listes memo, transformers transversaux et domaines DuploJS.

## Résolution de références du projet et de modules

`context.resolveDependencyFile(reference)` retourne un `DEither.Maybe<DependencyFile>`. Il résout les symboles et alias TypeScript, puis ne retient que les déclarations dans le projet, hors de `node_modules`, sous `projectWorkDirectory` et dans un fichier autre que le fichier courant. Après sélection d'une référence locale, `context.registerDependencyFile(dependencyFile)` enregistre son chemin dans `file.dependencyFiles` et retourne l'identifiant source du package. Le build transformera ensuite ce fichier.

`context.resolveReferenceModule(reference, moduleName, entryPattern?)` retourne un `DEither.Maybe<ResolvedModuleReference>` avec symbole résolu, package, chemin d'entrée et nom d'export. Utiliser ces données pour router les bibliothèques prises en charge, même lorsque l'import local est renommé. Ne pas supposer une compatibilité générale avec `node_modules` ni convertir automatiquement les packages npm en dépendances partagées.

## Dépendances partagées

Une shared dependency est une définition Go réutilisable. Son contrat (`SharedDependency`) porte `imports`, `declarations` et `init`, créée avec `createSharedDependency`. La définir dans un module dédié à l'opération qui l'utilise et envelopper sa construction dans `DCommon.memo`. Les fonctions/types d'un domaine DuploJS gardent leur organisation par opération : un `index.ts` expose leurs handlers et un fichier dédié contient les dépendances partagées concernées.

Le dossier `src/transpiler/sharedDependency/` définit le contrat général et les dépendances fournies par défaut. Les dépendances par défaut sont elles aussi memoïsées et assemblées par `build` avec celles effectivement enregistrées. Dans un transformer ou handler qui en a besoin, appeler `context.registerSharedDependency(dependency.value)` ; cet appel ajoute l'objet au set global, l'import au fichier courant et retourne l'identifiant du package Go à utiliser. Réutiliser la même instance memoïsée : la déduplication du set dépend de l'identité des objets. Si aucune dépendance n'est demandée, le build n'émet pas de fichier partagé.

## Identifiants et références

Utiliser `context.createSourceIdentifier(value)` pour les noms issus de TypeScript ou les identifiants de package, à la déclaration et à chaque référence correspondante. Utiliser `context.generateIdentifier()` pour les temporaires et réutiliser l'objet retourné pour toutes ses références. Le compteur est global à toute la transpilation ; ne pas le réinitialiser par fichier ou fonction et ne pas fabriquer de temporaires à partir de noms source.

## Skills et documentation à consulter

Respecter `AGENTS.md`, le routeur API et le routeur des concepts DuploJS avant d'inventer un utilitaire ou une API. Appliquer `duplojs-fundamental` pour les choix TypeScript. Consulter `go-ast` pour les nœuds et groupes de l'AST Go, et `go-printer` pour leur rendu. Si une demande modifie explicitement ces couches ou le CLI, appliquer aussi le skill spécialisé correspondant.

Les API TypeScript installées sont `typescript/ast` et `typescript/async`. Vérifier leurs déclarations locales plutôt que de reprendre une API d'une autre version. Attendre les résolutions asynchrones du checker et les transformations enfants avant de composer le résultat.
