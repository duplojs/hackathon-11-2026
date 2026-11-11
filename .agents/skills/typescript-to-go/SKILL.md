---
name: typescript-to-go
description: Créer ou modifier le build et les transformers TypeScript vers Go, leurs contextes, le parcours des dépendances et les dépendances partagées. À utiliser pour src/transpiler/ et son raccordement au CLI.
---

# Transpiler TypeScript vers Go

## Repères et responsabilités

- [bin/index.ts](../../../bin/index.ts) : options `--tsconfig`, `--input`, `--output`, impression et écriture des fichiers.
- [createTypescriptInstance.ts](../../../src/transpiler/createTypescriptInstance.ts) : ouverture du projet TypeScript ; le dossier du `tsconfig` devient `workDirectory`.
- [build.ts](../../../src/transpiler/build.ts) : parcours depuis l'entrée, émission des fichiers et assemblage des dépendances partagées.
- [transformSourceFile.ts](../../../src/transpiler/transformSourceFile.ts) et [createFile.ts](../../../src/transpiler/createFile.ts) : transformation d'une source, assemblage du `GoFile` et construction de sa fonction `init`.
- [factory.ts](../../../src/transpiler/factory.ts) : contrat `Transformer`, factory, dispatch et résultats.
- [context/transpilation.ts](../../../src/transpiler/context/transpilation.ts), [context/file.ts](../../../src/transpiler/context/file.ts), [context/build.ts](../../../src/transpiler/context/build.ts) : état global, état du fichier et opérations des transformers.
- [sharedDependency.ts](../../../src/transpiler/sharedDependency.ts) : définition d'une dépendance partagée et de son package.
- [transformers/](../../../src/transpiler/transformers/) : transformers classés par catégorie ; [helpers/typescriptExpression.ts](../../../src/transpiler/transformers/helpers/typescriptExpression.ts) traite notamment les identifiants et leurs dépendances.

Appliquer [duplojs-fundamental](../duplojs-fundamental/SKILL.md) et les routeurs indiqués dans `AGENTS.md`. Consulter [go-ast](../go-ast/SKILL.md) pour modifier les nœuds Go et [go-printer](../go-printer/SKILL.md) pour leur rendu. Appliquer les skills CLI ou serveur lorsque ces couches sont concernées.

Le transpiler construit l'AST Go ; le printer le rend en texte ; le CLI gère les entrées et les sorties. Lire les contrats et les appelants avant une modification : les principes ci-dessous ne signifient pas que toutes les formes TypeScript disposent déjà d'un transformer.

## Build depuis le fichier d'entrée

Le CLI crée l'instance TypeScript depuis le `tsconfig`, puis consomme le générateur asynchrone `build(typescriptInstance, input)`. L'entrée est le premier fichier transformé ; les autres fichiers du projet ne sont pas tous parcourus d'avance.

`build` crée un seul `TranspilationContext` pour toute la construction. Il maintient une file `pending`, initialisée avec l'entrée, et un ensemble `built` de chemins déjà traités. Chaque transformation complète d'un fichier révèle ses dépendances ; leurs chemins alimentent la suite du parcours. Préserver la progression de la file et le traitement unique d'un fichier lorsque plusieurs sources le référencent.

Les émissions réussies portent l'information `build-source-file` ou `build-shared-dependencies-file` et la valeur `{ file, outputPath }`. Pour une source, le chemin de sortie est relatif au dossier du `tsconfig`, avec `.go` ajouté au nom source : `index.ts` donne `index.ts.go`. Après les sources, le fichier des dépendances partagées est émis seulement si des dépendances ont été demandées. Les refus de résolution ou de transformation arrêtent le parcours et remontent au consommateur.

Le CLI imprime chaque AST puis écrit sous `--output`. Il supprime actuellement ce dossier récursivement avant la construction : pour vérifier un exemple sans toucher à une sortie existante, choisir un dossier temporaire dédié.

## Trois contextes

`TranspilationContext` conserve les données communes à tous les fichiers :

- `typeChecker` : checker du projet TypeScript.
- `projectWorkDirectory` : dossier du `tsconfig`.
- `sharedDependencies` : `Set<SharedDependency>` des dépendances demandées.
- `increment()` : compteur global utilisé pour les identifiants générés.

`createFileContext(sourceFile)` valide le chemin absolu de la source et retourne un `Either`. Son `FileContext` contient `sourceFile`, `currentFilePath` et trois ensembles propres à ce fichier : `dependencyFiles`, `topLevelDeclarations` et `imports`.

`createBuildContext(transpilation, file)` relie ces contextes et expose les opérations aux transformers. Une implémentation reçoit `(node, context)` ; elle appelle ses enfants avec `context.transform(node, transformers)`, en conservant ce contexte de build. Les informations globales passent par `context.transpilation`, les ajouts au fichier par `context.file`. Créer un contexte de fichier par source, sans recréer le contexte global ni son compteur pour les enfants.

Les API TypeScript installées sont `typescript/ast` et `typescript/async`. Vérifier leurs déclarations locales avant de reprendre une API d'une autre version. Attendre les consultations asynchrones du checker et les transformations enfants avant de composer les résultats.

## Transformers et listes selon le résultat attendu

Déclarer chaque constante avec le contrat `Transformer<GoNode> = createTransformer(implementation)`. Le générique décrit le résultat Go, pas le nœud TypeScript reçu. La factory reçoit seulement l'implémentation ; la garde TypeScript et les vérifications de prise en charge sont dans celle-ci.

```ts
export const numericLiteralTransformer: Transformer<GO.AST.FloatLiteral> = createTransformer(
	(node, context) => {
		if (!TS.isNumericLiteral(node)) {
			return context.notSupport(node);
		}

		return context.success({
			result: GO.AST.floatLiteral({ value: node.text }),
		});
	},
);
```

Le contrat sur la constante coupe le cycle d'inférence entre le transformer, ses appels récursifs et les registres. Laisser `createTransformer` inférer son générique depuis ce contrat, sans le répéter sur la factory ni annoter le retour du callback. Conserver son générique par défaut `never` et son `NoInfer` sur le résultat. À l'intérieur, laisser les valeurs et retours s'inférer.

Construire les nœuds Go via les factories de l'AST. Spécialiser chaque transformer pour une forme réutilisable, indépendante d'un exemple ou d'un nom de fonction. Consulter le checker pour les types inférés au lieu de les supposer à partir d'un exemple.

Choisir les candidats selon la catégorie Go attendue : `expressionTransformers`, `typeTransformers`, `statementTransformers`, `declarationTransformers`, ou une liste plus restreinte. `sourceFileTransformers` compose déclarations et instructions. Une liste globale indifférenciée permettrait de produire un type là où une instruction est requise.

Le dispatch infère l'union des résultats depuis les contrats des constantes de la liste. Conserver le type précis des listes : une annotation générale `readonly Transformer[]` perd cette précision. Aucun générique explicite n'est nécessaire sur `context.transform`.

Conserver `DCommon.memo(() => [...])` pour les registres récursifs d'expressions, d'instructions et leur composition au niveau fichier ; lire `.value` au moment de transformer. L'évaluation différée évite les accès avant initialisation dans les imports circulaires. Ce mécanisme et le contrat sur les constantes résolvent deux problèmes distincts : initialisation et inférence. Laisser le mémo inférer son type sans recopier les contrats dans un tuple.

Placer les helpers partagés dans `src/transpiler/transformers/helpers/` et les exporter depuis son `index.ts`. Pour une expression enfant, utiliser `transformExpression(node, context)` afin de conserver le traitement des identifiants et de leurs dépendances avant le dispatch des autres expressions.

## Résultats et refus

Les implémentations acceptent un retour synchrone ou une promesse (`DCommon.MaybePromise`). Ajouter `async` seulement lorsque nécessaire. Le dispatch et `context.transform` restent asynchrones pour leurs appelants.

Un transformer retourne l'une de ces issues :

- `transformation-success` : `context.success({ result, before? })`, avec `before` initialisé à `[]` s'il est omis.
- `transformation-not-supported` : `context.notSupport(content)`, autorise l'essai du candidat suivant.
- `transformation-error` : `context.error(content)`, erreur terminale à propager.
- `notfound-transformer` : aucun candidat n'a pris en charge le nœud, éventuellement dans un enfant ; refus terminal à propager.

Le dispatch essaie les transformers séquentiellement avec `DGenerator.asyncReduce`, en partant d'un `notfound-transformer` portant le nœud concerné. Seul `transformation-not-supported` continue la recherche ; toutes les autres issues terminent le dispatch avec le résultat reçu. Si tous les candidats refusent, le `notfound-transformer` initial est retourné.

Sélectionner et déballer une réussite avant d'en utiliser le contenu ; propager les autres résultats sans construire de réussite partielle. Un `notfound-transformer` enfant ne devient pas un `transformation-not-supported` du parent.

Effectuer les vérifications d'éligibilité avant de modifier le contexte partagé : le dispatch ne restaure pas ses ensembles lorsqu'un candidat refuse. Un problème de placement découvert après transformation des enfants relève d'une erreur terminale, comme `unsupported-binary-preparation` dans le transformer binaire, plutôt que d'un nouvel essai avec un contexte déjà modifié.

## Placement : résultat, préparations et déclarations du fichier

`TransformationSuccessPayload` contient uniquement `result` et `before`. `before` accepte des `GO.AST.Statement | GO.AST.LocalDeclaration` : ce sont les opérations nécessaires avant l'évaluation du résultat, dans son contexte d'exécution.

Le parent place explicitement les `before` de ses enfants ou les transmet dans son propre résultat jusqu'au parent capable de les consommer. Préserver l'ordre d'évaluation, la portée, les conditions et la répétition. Une préparation conditionnelle ne doit pas devenir inconditionnelle ; une préparation dans une boucle doit rester exécutée au bon rythme.

Le [transformer d'appel](../../../src/transpiler/transformers/expression/callExpression.ts) illustre cette contrainte. Avec des arguments, il accumule d'abord les `before` de la fonction appelée et affecte celle-ci à un identifiant généré. Puis, pour chaque argument dans l'ordre, il ajoute ses `before` et une déclaration locale contenant son résultat. L'appel final utilise ces identifiants. Une préparation d'un argument ultérieur ne passe donc pas avant l'évaluation d'un argument précédent. Sans argument, il conserve les préparations de la fonction appelée sans créer ces temporaires.

Le [transformer de bloc](../../../src/transpiler/transformers/statement/block.ts) consomme les préparations de chaque instruction juste avant son résultat, dans le bloc. Les transformers de retour ou d'instruction d'appel transmettent les préparations de leur expression au parent.

Pour ajouter des éléments au niveau du package depuis un transformer, utiliser les ensembles du fichier :

- `context.file.topLevelDeclarations.add(declaration)` pour une déclaration supplémentaire.
- `context.file.imports.add(importDeclaration)` pour un import manuel.

Ces ajouts sont collectés directement lors de l'assemblage du fichier. Ne pas les retourner dans un ancien champ `topLevelDeclarations` du payload. Les déclarations ajoutées doivent avoir des noms et références cohérents et ne pas dépendre de variables hors de leur portée. Les ensembles de nœuds dédupliquent par identité d'objet, pas par contenu.

## Assemblage d'une source et fonction init

`transformSourceFile(sourceFile, transpilationContext)` est une orchestration hors du dispatch, pas un transformer créé avec `createTransformer`. Elle crée les contextes du fichier et de build, puis parcourt les statements séquentiellement avec `sourceFileTransformers.value`.

Pour chaque réussite, elle ajoute les `before` à la liste d'exécution `init`. Un résultat portant le groupe de tags `declaration` rejoint les déclarations du fichier ; les autres résultats rejoignent `init` après leurs préparations. Les déclarations locales de préparation restent donc dans `init`.

Elle construit les imports des `dependencyFiles` à partir de leurs chemins relatifs à `projectWorkDirectory`, puis ajoute les imports manuels. Elle assemble les déclarations principales, suivies de celles ajoutées à `context.file.topLevelDeclarations`. Le package est calculé avec `createSourceIdentifier(currentFilePath)`.

`createFile({ packageName, imports, topLevelDeclaration, init })` ajoute une déclaration de fonction Go `init`, même si sa liste d'instructions est vide, puis construit le `GoFile`. Le champ `init` est un paramètre d'assemblage ; il n'existe pas dans l'AST final `GoFile`. Le printer imprime la déclaration déjà construite. Cette chaîne ne crée pas de fonction `main`.

En cas de réussite, `transformSourceFile` retourne `DEither.success({ file, context })`, ce qui permet au build de récupérer les dépendances découvertes. Propager les refus avant cet assemblage.

## Références et dépendances du projet

Les dépendances sont déduites par les transformers au fil des références rencontrées. `await context.registerDependency(node)` accepte un `Identifier`, `QualifiedName`, `PropertyAccessExpression` ou `ElementAccessExpression` TypeScript. Ce contrat de résolution ne signifie pas que toutes ces expressions disposent déjà d'un transformer.

La résolution consulte le symbole, traite les shorthand properties et suit les alias TypeScript. Elle utilise le chemin de la déclaration de valeur résolue. Pour un chemin absolu valide différent du fichier courant, elle l'ajoute à `context.file.dependencyFiles` et retourne `DEither.some(packageIdentifier)`. Un symbole absent ou inconnu, une déclaration sans chemin utilisable ou une référence au fichier courant retourne `DEither.none()`.

Le helper `transformExpression` convertit actuellement une référence locale en identifiant source et une référence à un autre fichier en sélecteur `packageIdentifier.sourceIdentifier`. Enregistrer la dépendance permet à la fois son import dans le fichier courant et sa transformation ultérieure par le build.

Le package d'un fichier est prédictible depuis son chemin absolu, avant son build. Utiliser le même encodage pour sa déclaration et ses références. Pour la visibilité TypeScript, s'appuyer sur la résolution du checker : si TypeScript permet la référence importée, considérer l'export comme établi, sans reconstruire un registre parallèle des exports.

Il n'existe pas de mécanisme général de compatibilité avec les bibliothèques externes ou `node_modules`. Leur présence peut conduire à un échec de compilation. Ne pas ajouter implicitement de traduction de packages npm, de fallback ou de conversion automatique en shared dependencies pour les rendre compatibles.

### Imports renommés : évolution à prévoir

La résolution suit déjà les alias pour retrouver le fichier, mais le helper utilise encore le texte de l'identifiant local pour construire le membre du sélecteur. Cela ne suffit pas pour `import { foo as bar }` : le membre du package source reste `foo`.

La direction souhaitée est de matérialiser le renommage au niveau du package du fichier importateur afin que le nom local reste utilisable dans ses fonctions. Une liaison vers la valeur importée est une piste pour les valeurs compatibles ; le choix de représentation et la conservation de la sémantique des imports restent à implémenter. Ne pas présenter une copie de valeur comme un alias universel, ni cette prise en charge comme déjà acquise. Cette évolution concerne la résolution du symbole, son nom exporté et les références au nom local.

## Dépendances partagées à la demande

Une shared dependency est du code Go prédéfini réutilisable, par exemple une fonction utilitaire. La déclarer une fois à un emplacement dédié avec `createSharedDependency({ imports, topLevelDeclarations, init })` et réutiliser cette définition. La factory produit un objet taggé `SharedDependency` ; il n'a pas de champ `name`.

Appeler `context.useShardDependency(sharedDependency, identifier)` depuis le transformer qui en a besoin. Conserver l'orthographe de l'API actuelle. Cette méthode :

- ajoute la définition à `context.transpilation.sharedDependencies` ;
- ajoute l'import partagé à `context.file.imports` ;
- retourne un `SelectorExpression` visant l'identifiant fourni dans le package partagé.

Les références et déclarations utilisent le même identifiant exporté de la dépendance. Le package actuel s'appelle `shard_dependencies` et le build émet `shard_dependencies.go`. Après le parcours des sources, il concatène les `imports`, `topLevelDeclarations` et `init` des définitions demandées, puis utilise `createFile` pour assembler ce fichier.

La déduplication globale repose sur l'identité de l'objet dans un `Set`, pas sur un nom ni une comparaison structurelle. Réutiliser la même instance entre transformers et fichiers ; recréer une définition identique ne la déduplique pas. Une dépendance non demandée n'est pas émise. Les shared dependencies sont distinctes des fichiers source découverts par `registerDependency`.

## Identifiants source et identifiants générés

Utiliser `context.createSourceIdentifier(value)` pour un nom provenant de TypeScript, une clé ou un chemin servant de nom de package. Cette opération déterministe centralise l'encodage vers un identifiant Go compatible ; l'utiliser à la déclaration et à chaque référence. Elle préfixe actuellement par `Duplojs_`, conserve les caractères ASCII alphanumériques et `_`, et encode les autres caractères. Ne pas reconstruire cet encodage dans un transformer.

Utiliser `context.generateIdentifier()` pour une nouvelle variable temporaire, puis réutiliser l'objet retourné pour toutes ses références. Les noms actuels sont `Generated_1`, `Generated_2`, etc., avec un compteur partagé par toute la transpilation. Le préfixe distinct sépare ces temporaires des identifiants source encodés. Ne pas réinitialiser le compteur par fichier ou par fonction, ni inventer un nom temporaire à partir d'un nom source.

## Vérification d'une évolution

Après une modification TypeScript, exécuter `pnpm test:types` et `pnpm test:lint`. Pour une évolution du build ou d'un transformer, vérifier aussi le rendu d'un exemple pertinent dans un dossier de sortie dédié, notamment l'ordre des préparations, leur portée et les imports demandés. Respecter les validations des skills AST et printer lorsque ces couches changent.

Le [projet 00](../../../projects/00/index.ts) illustre une fonction numérique, l'appel avec temporaires et `init`. Le [projet 01](../../../projects/01/index.ts) contient des imports et des usages supplémentaires ; lire les transformers présents avant de le considérer comme un cas entièrement pris en charge. Les exemples servent à vérifier des comportements, pas à spécialiser le transpiler pour leurs seuls noms ou formes.
