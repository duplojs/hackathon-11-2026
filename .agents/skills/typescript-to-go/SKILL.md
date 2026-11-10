---
name: typescript-to-go
description: Créer ou modifier les transformers TypeScript vers Go, leur contexte et leurs dépendances partagées. À utiliser pour src/transpiler/ et son raccordement au CLI.
---

# Transpiler TypeScript vers Go

## Repères

- [transformSourceFile.ts](../../../src/transpiler/transformSourceFile.ts) : conversion d'un fichier avec `transformSourceFile(sourceFile, context, packageName)`.
- [factory.ts](../../../src/transpiler/factory.ts) : `createTransformer`, dispatch `transform` et résultats de transformation.
- [context.ts](../../../src/transpiler/context.ts) : création du contexte, compteur d'identifiants et espaces main/dépendances partagées.
- [localContext.ts](../../../src/transpiler/localContext.ts) : informations courantes transmises séparément à chaque transformation.
- [sharedDependency.ts](../../../src/transpiler/sharedDependency.ts) : `SharedDependency` et `createSharedDependency`.
- [transformers/](../../../src/transpiler/transformers/) : emplacement des transformers spécialisés.
- [transformers/helper/](../../../src/transpiler/transformers/helper/) : helpers de transformation, dont `typescriptExpression.ts` et sa fonction `transformExpression`.
- [bin/index.ts](../../../bin/index.ts) : CLI avec les options `--tsconfig`, `--input`, `--output`.
- [bin/createTypescriptInstance.ts](../../../bin/createTypescriptInstance.ts) : chargement du projet TypeScript, dont `project.checker`.
- [projects/00/index.ts](../../../projects/00/index.ts) : premier exemple, déclaration d'une fonction `add` puis son appel.

Appliquer [duplojs-fundamental](../duplojs-fundamental/SKILL.md) et les routeurs de documentation indiqués dans `AGENTS.md`. Consulter [go-ast](../go-ast/SKILL.md) pour modifier l'AST Go et [go-printer](../go-printer/SKILL.md) pour modifier son rendu. Appliquer les skills CLI ou serveur lorsqu'une modification concerne ces couches.

## Conversion d'un fichier et contexte

Créer le contexte d'accumulation avec `createTransformerContext(checker)` avant de transformer les fichiers, puis passer la même instance à chaque appel `transformSourceFile(sourceFile, context, packageName)`. Les accumulateurs et le compteur sont partagés, mais le contenu de chaque `GoFile` reste propre au fichier transformé. Ne pas recréer ce contexte pour chaque fichier ou chaque enfant.

`transformSourceFile` a pour seul rôle de convertir un `TS.SourceFile` en `GO.AST.GoFile`. Elle se situe en dehors du dispatch des transformers et n'est pas créée avec `createTransformer`. Elle crée le contexte local `{ sourceFile }`, parcourt les éléments du fichier et appelle `context.transform` avec `sourceFileTransformers.value`, qui rassemble les transformers de déclarations et d'instructions. Elle assemble les résultats propres à ce fichier dans `imports`, `declarations` et `init`. Les `topLevelDeclarations` retournées par les enfants sont insérées dans les déclarations de ce même fichier, dans l'ordre de transformation.

Le nom de package est fourni par l'appelant comme `GO.AST.Identifier`. Cette conversion n'impose aucun package, ne crée aucune fonction `main` et ne lit ni n'alimente `context.main`. Elle n'organise pas l'assemblage de plusieurs fichiers. Les instructions exécutables de niveau fichier TypeScript sont placées dans `GoFile.init` : le printer rend cette liste dans une fonction Go `init`. La conversion ne construit pas elle-même une déclaration de fonction `init`.

Préserver l'ordre des instructions : ajouter les `before` de chaque enfant à `init`, puis son résultat s'il s'agit d'une instruction. Les `before` restent dans `init`, y compris leurs déclarations locales ; ne pas les remonter au niveau du package. Les résultats principaux qui sont des imports ou des déclarations Go restent respectivement dans `imports` ou `declarations`. Une déclaration locale produite comme résultat principal d'un élément de niveau fichier peut ainsi être placée dans `declarations`, tandis qu'une déclaration locale de préparation reste dans `init`.

En cas de réussite, retourner directement `DEither.success(goFile)`, soit un `DEither.Success<GO.AST.GoFile>`. Ne pas utiliser `context.success({ result: goFile })` ni envelopper le fichier dans un `TransformationSuccess`. Propager tout refus reçu d'une transformation enfant tel quel jusqu'à l'appelant ; ne pas construire un fichier après un refus. Le checker et les accumulateurs partagés restent disponibles pour les transformers via le contexte reçu.

Le contexte s'enrichit au fil du traitement par ses méthodes. Les tableaux et le compteur sont conservés en closure ; les listes sont exposées en lecture seule. Le contexte fournit :

- `checker` pour consulter les types inférés, les signatures et les symboles.
- `transform(data, transformers, localContext)` pour transformer une donnée avec le même contexte d'accumulation et le contexte local fourni.
- `success(payload)` et `error(content)` pour construire les résultats.
- `notSupport(content)` pour retourner un `TransformationNotSupported` lorsque le transformer ne prend pas en charge le nœud reçu.
- `createIdentifier()` pour allouer un identifiant Go.
- `main` pour accumuler les imports et déclarations du fichier principal.
- `sharedDependencies` pour accumuler les dépendances partagées demandées.

Le compteur commence à zéro et augmente simplement avec `+= 1`. Les identifiants produits sont `generated_1`, `generated_2`, etc. Réutiliser l'identifiant obtenu pour ses références. Ce mécanisme distingue les noms générés dans un contexte ; il ne vérifie pas les collisions avec les noms déjà présents dans les sources.

Le transformer reçoit trois arguments : `(data, context, localContext)`. `data` est un `TS.Node`, à affiner dans l'implémentation. `LocalTransformerContext` porte les informations courantes, actuellement `sourceFile`, avec des propriétés en lecture seule. Il ne contient ni accumulateur ni méthode d'ajout. Le transmettre explicitement à chaque appel enfant ; lorsqu'une information courante change, fournir un nouvel objet local sans modifier celui du parent. Ajouter les autres informations locales seulement selon les besoins des transformations.

L'API TypeScript installée utilise `typescript/ast` et `typescript/async`. Vérifier ses déclarations locales avant de reprendre une API d'une autre version. Les transformers acceptent un retour `DCommon.MaybePromise` : un résultat `Either` direct ou une promesse de ce résultat. Utiliser une fonction synchrone lorsque le traitement le permet ; n'ajouter `async` que lorsque nécessaire. `transform`, `context.transform` et `transformSourceFile` conservent un retour asynchrone commun aux appelants. Attendre les consultations du checker et les transformations enfants avant de composer le résultat. Les factories, `success`, `error`, `notSupport` et les méthodes d'ajout au contexte restent synchrones.

## Transformers génériques

Créer les transformers avec `const transformer: Transformer<GoNode> = createTransformer(implementation)` et les placer dans `src/transpiler/transformers/`. La factory reçoit uniquement l'implémentation : aucun predicate séparé n'est déclaré ni stocké dans le transformer.

Placer les helpers partagés entre transformers dans `src/transpiler/transformers/helper/` et les exporter depuis son `index.ts`. Ils restent auprès des transformers plutôt qu'à la racine du transpiler avec la factory, les contextes et les dépendances partagées.

Déclarer le contrat `Transformer<GoNode>` directement sur chaque constante exportée. Le générique décrit le nœud Go produit, pas le nœud TypeScript reçu. Ce contrat coupe le cycle d'inférence entre le transformer, ses appels récursifs et les registres avant l'analyse du callback. Le générique de `createTransformer` est inféré depuis ce contrat : ne pas répéter le type Go sur l'appel à la factory ni annoter le retour de son callback. Un générique explicite sur la factory seule ne suffit pas à couper ce cycle. La factory conserve `never` par défaut et `NoInfer` sur le résultat du callback pour recevoir le type depuis le contrat plutôt que depuis l'implémentation. Conserver l'inférence des valeurs et des retours à l'intérieur de l'implémentation.

Vérifier la prise en charge et affiner le `TS.Node` dans l'implémentation, avec les gardes TypeScript et les outils DuploJS adaptés. Si la forme ou une caractéristique du nœud n'est pas prise en charge, retourner `context.notSupport(content)`. Effectuer ces vérifications avant de modifier les accumulateurs du contexte, puisque le dispatch peut ensuite essayer un autre transformer. Cette règle remplace entièrement l'ancien modèle fondé sur un predicate préalable.

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

Le transformer produit un nœud de l'AST Go via ses factories. Il peut traiter une déclaration, une instruction, une expression, un type ou toute autre forme de nœud TypeScript ; il n'est pas limité aux expressions.

Spécialiser chaque transformer pour une tâche réutilisable, indépendante du projet 00, du nom du fichier et d'un emplacement arbitraire dans l'arbre. Utiliser le contexte pour les informations nécessaires. Par exemple, le retour de `add` est inféré : ne pas supposer son type uniquement à partir de cet exemple.

Le parent transforme les enfants avec `await context.transform(data, transformers, localContext)` et les collections de transformers adaptées aux résultats Go attendus. Traiter les résultats `Either` avant de construire le résultat parent. Exécuter les transformations dans l'ordre requis par le programme et les ajouts au contexte partagé.

`transform` et `context.transform` déduisent le résultat depuis le type de la liste fournie : le nœud de réussite est l'union des résultats Go déclarés dans les contrats `Transformer<GoNode>` des constantes. Conserver le type précis des listes réutilisées ; une annotation générale `readonly Transformer[]` perd cette précision. Une liste mêlant un transformer de littéral numérique et un transformer d'appel produit ainsi `TransformationSuccess<FloatLiteral | CallExpression>`, en plus des refus possibles. Aucun générique explicite n'est nécessaire lors de l'appel au dispatch.

Conserver `DCommon.memo(() => [...])` pour les registres récursifs `expressionTransformers`, `statementTransformers` et leur composition `sourceFileTransformers`. Lire leur `.value` au moment de la transformation : l'évaluation différée évite de lire un transformer avant l'initialisation de sa constante lors des imports circulaires. Le mémo gère cet ordre d'initialisation ; le contrat sur les constantes résout séparément le cycle d'inférence. Laisser le mémo et sa callback inférer leurs types depuis les constantes, sans recopier leurs contrats dans un tuple ni annoter le retour du mémo.

```ts
export const expressionTransformers = DCommon.memo(() => [
	numericLiteralTransformer,
	binaryExpressionTransformer,
	callExpressionTransformer,
	parenthesizedExpressionTransformer,
]);
```

## Résultats et placement

Un transformer retourne directement ou par promesse l'une des quatre issues :

- `transformation-success` : résultat principal et éventuels éléments secondaires.
- `transformation-error` : erreur terminale à propager.
- `transformation-not-supported` : ce transformer ne prend pas en charge le nœud ; créé avec `context.notSupport(content)`.
- `notfound-transformer` : aucun transformer n'a pu traiter une donnée, éventuellement lors d'une transformation enfant ; résultat terminal à propager.

Le dispatch parcourt les transformers séquentiellement avec `DGenerator.asyncReduce` et attend le résultat de chaque implémentation, même lorsqu'elle retourne un `Either` synchrone. Initialiser la réduction avec un `notfound-transformer` portant la donnée concernée. Une sélection exhaustive des informations décide de la suite :

- `transformation-not-supported` produit `next(lastValue)` pour essayer le candidat suivant.
- `transformation-success`, `transformation-error` et `notfound-transformer` produisent `exit(result)` et retournent le résultat reçu tel quel.

Si la liste est vide ou si tous les transformers retournent `TransformationNotSupported`, la réduction retourne le `NotfoundTransformer` initial. Le dispatch consomme ainsi les résultats non pris en charge ; ses sorties effectives sont une réussite, une erreur terminale ou un `NotfoundTransformer`.

Un `NotfoundTransformer` reçu d'un enfant remonte tel quel de parent en parent jusqu'à l'appelant. Ne pas le convertir en `TransformationNotSupported`, ne pas essayer un autre candidat après ce résultat et ne pas construire une réussite partielle. Seul `TransformationNotSupported` autorise la poursuite de la recherche dans la liste courante.

`context.success` attend `result`, le nœud Go principal, et accepte deux listes optionnelles, initialisées à vide :

- `before` : uniquement des `Statement | LocalDeclaration` Go.
- `topLevelDeclarations` : des `TopLevelDeclaration` Go, union qui exclut déjà les imports.

Le parent décide manuellement où insérer les `before` de ses enfants. S'il ne peut pas les consommer à son niveau, il les transmet dans son propre `before`, jusqu'au parent capable de les placer. Préserver l'ordre d'évaluation, les conditions d'exécution et la portée lors de cette insertion. Une préparation conditionnelle ou répétée ne doit pas devenir inconditionnelle ou exécutée une seule fois par simple remontée.

Consommer ou propager explicitement les résultats secondaires. Retourner `topLevelDeclarations` n'ajoute pas automatiquement ces nœuds à `context.main`. Le parent responsable les insère dans le fichier ou l'accumulateur approprié ; éviter de les ajouter deux fois. Dans `transformSourceFile`, elles appartiennent au fichier en cours. Le transformer qui produit une déclaration remontée reste responsable de ses noms et de ses références, notamment lorsqu'elle dépend de données locales.

## Espaces main et dépendances partagées

`context.main.push(...nodes)` accepte des `ImportDeclaration | TopLevelDeclaration`. La méthode sépare les imports dans `main.imports` et les autres déclarations dans `main.topLevelDeclarations`.

`context.sharedDependencies.push(sharedDependency)` reçoit une dépendance partagée nommée. Elle ajoute ses listes `imports` et `topLevelDeclarations` aux listes correspondantes de `sharedDependencies`. Les deux espaces sont indépendants. Passer par leurs méthodes pour ajouter du contenu ; ne pas modifier directement les listes exposées en lecture seule.

Ces espaces sont partagés dans le contexte. Leur utilisation pour assembler un programme ou un éventuel fichier `main` relève d'une orchestration distincte de `transformSourceFile`. Leur contenu n'est pas repris automatiquement dans les fichiers convertis. Une politique de package `main` et la création d'une fonction `main` doivent être décidées par cette orchestration. Les instructions propres à un fichier sont représentées par son champ `GoFile.init` ; le printer se charge de son rendu.

## Dépendances partagées à la demande

Définir une dépendance partagée à un endroit dédié avec `createSharedDependency({ name, imports, topLevelDeclarations })`, puis réutiliser cette dépendance partagée dans les transformers qui en ont besoin. Cette factory utilise `DModeling.createTaggedObjectFactory` et produit un `SharedDependency` portant l'`ObjectTag<"SharedDependency">`. Elle contient son nom de déduplication et deux listes distinctes : `imports` pour les `ImportDeclaration`, `topLevelDeclarations` pour les `TopLevelDeclaration`. `context.sharedDependencies.push` accepte uniquement ce type taggé, pas un objet brut ni un nœud Go isolé.

Appeler `context.sharedDependencies.push(sharedDependency)` au besoin. Le premier ajout d'un nom insère ses imports et ses déclarations ; les suivants sont ignorés, même si l'objet fourni est différent. Employer un nom distinct pour chaque dépendance partagée distincte : le mécanisme ne compare pas leurs contenus.

La déduplication s'applique au contexte partagé entre les fichiers. Une dépendance partagée demandée depuis plusieurs fichiers n'est ajoutée qu'une fois. Elle porte sur le nom de la dépendance partagée entière, pas sur chaque import ou déclaration séparément. Une dépendance partagée non demandée n'est pas ajoutée. Les déclarations et leurs références partagent les identifiants définis dans la dépendance partagée ; le nom de déduplication n'est pas automatiquement un identifiant Go.

## État actuel et évolution

Lire le code avant chaque intervention. `factory.ts` et `context.ts` exposent le contrat sans predicate décrit ci-dessus ; des transformers spécialisés peuvent encore utiliser l'ancienne signature tant que leur migration n'a pas été effectuée. Conserver le nouveau contrat comme référence et migrer les implémentations lorsqu'une tâche le demande. Vérifier séparément le raccordement du parcours des fichiers, de l'émission des dépendances et du CLI.

Faire évoluer ces points selon la tâche demandée, une responsabilité à la fois. Le transpiler construit l'AST ; le printer le traduit en texte ; le CLI gère les entrées et les fichiers de sortie.

Après une modification TypeScript, vérifier avec `pnpm test:types` et `pnpm test:lint`. Respecter les règles de validation des skills AST et printer si ces domaines sont concernés.
