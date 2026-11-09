---
name: typescript-to-go
description: Créer ou modifier les transformers TypeScript vers Go, leur contexte et leurs dépendances constantes. À utiliser pour src/transpiler/ et son raccordement au CLI.
---

# Transpiler TypeScript vers Go

## Repères

- [typescriptSourceFile.ts](../../../src/transpiler/typescriptSourceFile.ts) : point d'entrée `transformSourceFile(sourceFile, context)`.
- [factory.ts](../../../src/transpiler/factory.ts) : `createTransformer`, dispatch `transform` et résultats de transformation.
- [context.ts](../../../src/transpiler/context.ts) : création du contexte, compteur d'identifiants et espaces main/dépendances.
- [localContext.ts](../../../src/transpiler/localContext.ts) : informations courantes transmises séparément à chaque transformation.
- [dependency.ts](../../../src/transpiler/dependency.ts) : `ConstantDependency` et `createConstantDependency`.
- [transformers/](../../../src/transpiler/transformers/) : emplacement des transformers spécialisés.
- [bin/index.ts](../../../bin/index.ts) : CLI avec les options `--tsconfig`, `--input`, `--output`.
- [bin/createTypescriptInstance.ts](../../../bin/createTypescriptInstance.ts) : chargement du projet TypeScript, dont `project.checker`.
- [projects/00/index.ts](../../../projects/00/index.ts) : premier exemple, déclaration d'une fonction `add` puis son appel.

Appliquer [duplojs-fundamental](../duplojs-fundamental/SKILL.md) et les routeurs de documentation indiqués dans `AGENTS.md`. Consulter [go-ast](../go-ast/SKILL.md) pour modifier l'AST Go et [go-printer](../go-printer/SKILL.md) pour modifier son rendu. Appliquer les skills CLI ou serveur lorsqu'une modification concerne ces couches.

## Entrée et contexte

Créer le contexte d'accumulation avec `createTransformerContext(checker)` avant de transformer les fichiers, puis passer la même instance à chaque appel `transformSourceFile(sourceFile, context)`. Les dépendances, les déclarations remontées et le compteur sont communs à l'ensemble des fichiers. Ne pas recréer ce contexte pour chaque fichier ou chaque enfant.

`transformSourceFile` crée uniquement le contexte local du fichier, contenant `sourceFile`. Les informations courantes changent ainsi d'un fichier à l'autre sans réinitialiser les accumulateurs partagés. Le checker reste disponible dans le contexte d'accumulation.

Son contrat de retour est `Promise<TransformationSuccess<GO.AST.GoFile> | TransformationError | NotfoundTransformer>`. En cas de réussite, construire le fichier avec `context.success({ result: goFile })`. Lors du raccordement des transformations, retourner tout refus reçu tel quel, quelle que soit sa raison, jusqu'à l'appelant ; ne pas construire un fichier après un refus.

Le contexte s'enrichit au fil du traitement par ses méthodes. Les tableaux et le compteur sont conservés en closure ; les listes sont exposées en lecture seule. Le contexte fournit :

- `checker` pour consulter les types inférés, les signatures et les symboles.
- `transform(data, transformers, localContext)` pour transformer une donnée avec le même contexte d'accumulation et le contexte local fourni.
- `success(payload)` et `error(content)` pour construire les résultats.
- `createIdentifier()` pour allouer un identifiant Go.
- `main` pour accumuler les imports et déclarations du fichier principal.
- `dependencies` pour accumuler les dépendances constantes demandées.

Le compteur commence à zéro et augmente simplement avec `+= 1`. Les identifiants produits sont `generated_1`, `generated_2`, etc. Réutiliser l'identifiant obtenu pour ses références. Ce mécanisme distingue les noms générés dans un contexte ; il ne vérifie pas les collisions avec les noms déjà présents dans les sources.

Le transformer reçoit trois arguments : `(data, context, localContext)`. `LocalTransformerContext` porte les informations courantes, actuellement `sourceFile`, avec des propriétés en lecture seule. Il ne contient ni accumulateur ni méthode d'ajout. Le transmettre explicitement à chaque appel enfant ; lorsqu'une information courante change, fournir un nouvel objet local sans modifier celui du parent. Ajouter les autres informations locales seulement selon les besoins des transformations.

L'API TypeScript installée utilise `typescript/ast` et `typescript/async`. Vérifier ses déclarations locales avant de reprendre une API d'une autre version. Les transformers acceptent un retour `DCommon.MaybePromise` : un résultat `Either` direct ou une promesse de ce résultat. Utiliser une fonction synchrone lorsque le traitement le permet ; n'ajouter `async` que lorsque nécessaire. `transform`, `context.transform` et `transformSourceFile` conservent un retour asynchrone commun aux appelants. Attendre les consultations du checker et les transformations enfants avant de composer le résultat. Les factories, `success`, `error` et les méthodes d'ajout au contexte restent synchrones.

## Transformers génériques

Créer les transformers avec `createTransformer(predicate, transformer)` et les placer dans `src/transpiler/transformers/`.

Le predicate établit la forme de la donnée acceptée dans l'AST TypeScript. Le transformer reçoit cette donnée typée, le contexte d'accumulation et le contexte local, puis produit un nœud de l'AST Go via ses factories. Il peut traiter une déclaration, une instruction, une expression, un type ou une autre donnée pertinente ; il n'est pas limité aux expressions.

Spécialiser chaque transformer pour une tâche réutilisable, indépendante du projet 00, du nom du fichier et d'un emplacement arbitraire dans l'arbre. Utiliser le contexte pour les informations nécessaires. Par exemple, le retour de `add` est inféré : ne pas supposer son type uniquement à partir de cet exemple.

Le parent transforme les enfants avec `await context.transform(data, transformers, localContext)` et les collections de transformers adaptées aux résultats Go attendus. Traiter les résultats `Either` avant de construire le résultat parent. Exécuter les transformations dans l'ordre requis par le programme et les ajouts au contexte partagé.

`transform` et `context.transform` déduisent le résultat depuis le type de la liste fournie : le nœud de réussite est l'union des nœuds produits par ses transformers. Conserver le type précis des listes réutilisées ; une annotation générale `readonly Transformer[]` perd cette précision. Une liste mêlant un transformer d'identifiant et un transformer de littéral entier produit ainsi `TransformationSuccess<Identifier | IntegerLiteral>`, en plus des refus possibles, sans générique explicite à l'appel.

## Résultats et placement

Un transformer retourne directement ou par promesse l'une des trois issues :

- `transformation-success` : résultat principal et éventuels éléments secondaires.
- `transformation-error` : erreur terminale à propager.
- `notfound-transformer` : absence de transformation applicable.

Le dispatch utilise un `DArray.reduce` synchrone : les predicates sont synchrones, un predicate faux produit `next(lastValue)` et le premier predicate vrai produit `exit(transformer(...))` avec le résultat direct ou la promesse du transformer. La fonction `transform` conserve un retour asynchrone, sans rendre la réduction asynchrone. Le résultat sélectionné est retourné tel quel, y compris `notfound-transformer` : ne pas essayer le candidat suivant après ce refus. Si aucun predicate n'accepte la donnée, retourner `notfound-transformer` avec la donnée concernée. Les parents propagent ce résultat d'enfant en parent jusqu'au point d'entrée, comme une erreur de transformation, sans l'ignorer ni le remplacer par une réussite vide.

`context.success` attend `result`, le nœud Go principal, et accepte deux listes optionnelles, initialisées à vide :

- `before` : uniquement des `Statement | LocalDeclaration` Go.
- `topLevelDeclarations` : des `TopLevelDeclaration` Go, union qui exclut déjà les imports.

Le parent décide manuellement où insérer les `before` de ses enfants. S'il ne peut pas les consommer à son niveau, il les transmet dans son propre `before`, jusqu'au parent capable de les placer. Préserver l'ordre d'évaluation, les conditions d'exécution et la portée lors de cette insertion. Une préparation conditionnelle ou répétée ne doit pas devenir inconditionnelle ou exécutée une seule fois par simple remontée.

Consommer ou propager explicitement les résultats secondaires. Retourner `topLevelDeclarations` n'ajoute pas automatiquement ces nœuds à `context.main`. Le parent responsable peut les y pousser ; éviter de les ajouter deux fois. Le transformer qui produit une déclaration remontée reste responsable de ses noms et de ses références, notamment lorsqu'elle dépend de données locales.

## Espaces main et dépendances

`context.main.push(...nodes)` accepte des `ImportDeclaration | TopLevelDeclaration`. La méthode sépare les imports dans `main.imports` et les autres déclarations dans `main.topLevelDeclarations`.

`context.dependencies.push(dependency)` reçoit une dépendance constante nommée. Elle ajoute ses listes `imports` et `topLevelDeclarations` aux listes correspondantes de `dependencies`. Les deux espaces sont indépendants. Passer par leurs méthodes pour ajouter du contenu ; ne pas modifier directement les listes exposées en lecture seule.

Ces espaces servent au niveau du fichier. Ils ne reçoivent pas directement des instructions exécutables ordinaires. La cible convenue est un `package main` : les déclarations restent au niveau du package et les instructions exécutables de niveau fichier TypeScript doivent être placées dans une fonction `main`. Le fichier des dépendances appartient au même package. Cette organisation relève de l'assemblage, pas du printer ni du transformer d'appel.

L'accumulateur `main` est global : chaque fichier transformé reprend le même main logique, avec ses imports et déclarations accumulés. Conserver ce partage entre les fichiers.

## Dépendances constantes à la demande

Définir une dépendance partagée à un endroit dédié avec `createConstantDependency({ name, imports, topLevelDeclarations })`, puis réutiliser cette constante dans les transformers qui en ont besoin. Cette factory utilise `DModeling.createTaggedObjectFactory` et produit un `ConstantDependency` portant l'`ObjectTag<"ConstantDependency">`. Elle contient son nom de déduplication et deux listes distinctes : `imports` pour les `ImportDeclaration`, `topLevelDeclarations` pour les `TopLevelDeclaration`. `context.dependencies.push` accepte uniquement ce type taggé, pas un objet brut ni un nœud Go isolé.

Appeler `context.dependencies.push(dependency)` au besoin. Le premier ajout d'un nom insère ses imports et ses déclarations ; les suivants sont ignorés, même si l'objet fourni est différent. Employer un nom distinct pour chaque dépendance distincte : le mécanisme ne compare pas leurs contenus.

La déduplication s'applique au contexte partagé entre les fichiers. Une dépendance demandée depuis plusieurs fichiers n'est ajoutée qu'une fois. Elle porte sur le nom de la dépendance entière, pas sur chaque import ou déclaration séparément. Une dépendance non demandée n'est pas ajoutée. Les déclarations et leurs références partagent les identifiants définis dans la constante ; le nom de déduplication n'est pas automatiquement un identifiant Go.

## État actuel et évolution

Lire le code avant chaque intervention et distinguer les conventions ci-dessus des parties restant à raccorder :

- `transformSourceFile` reçoit le contexte partagé, crée le contexte local et retourne actuellement une réussite contenant un `GoFile` depuis les listes de `main`. Son contrat prévoit aussi les refus, mais leur propagation sera raccordée au parcours des instructions source, qui n'est pas encore implémenté. Son nom de package utilise encore `sourceFile.fileName` comme ébauche.
- Aucun transformer spécialisé n'est encore implémenté. L'émission du fichier de dépendances et le pipeline complet du CLI restent à raccorder.

Faire évoluer ces points selon la tâche demandée, une responsabilité à la fois. Le transpiler construit l'AST ; le printer le traduit en texte ; le CLI gère les entrées et les fichiers de sortie.

Après une modification TypeScript, vérifier avec `pnpm test:types` et `pnpm test:lint`. Respecter les règles de validation des skills AST et printer si ces domaines sont concernés.
