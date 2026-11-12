---
name: go-ast
description: Conventions de conception et d'implémentation de l'AST Go en TypeScript. À utiliser pour toute création, modification ou extension des nœuds AST, de leurs factories et de leurs unions.
---

# Construction de l'AST Go

## Objectif

Construire un AST TypeScript capable de représenter de manière exhaustive les constructions du sous-ensemble de Go pris en charge.

L'AST doit permettre de générer du code Go à travers un printer indépendant.

L'objectif n'est pas de reproduire toutes les syntaxes du langage Go, mais de représenter toutes les opérations nécessaires au transpileur.

## Organisation

L'AST est situé dans `src/go/AST/`.

Il est organisé en domaines :

- `declaration/` : union `Declaration`, groupe de tags `DeclarationGroup` et nœuds de fonctions et méthodes.
- `expression/` : expressions, opérations, appels et accès aux valeurs.
- `statement/` : instructions, affectations et structures de contrôle.
- `type/` : constructions de types Go.
- `common/` : nœuds transversaux, dont les imports, les identifiants, les références de types et les déclarations également utilisables comme instructions.
- `base.ts` : union exhaustive `Node` et groupe de tags `NodeGroup`.
- `common/goFile.ts` : représentation d'un fichier Go.

Chaque nœud doit appartenir à un domaine cohérent avec son usage. Les déclarations
de variables, constantes et types sont définies dans `common/` et réexportées
par `declaration/` et `statement/`.

`Declaration`, défini dans `declaration/base.ts`, regroupe les déclarations
acceptées dans `GoFile.declarations`, sans règle de placement entre leurs
catégories. `GoFile.imports` contient séparément les `ImportDeclaration`, définis
dans `common/import.ts`. Un import porte uniquement le tag `[node]import` et
n'appartient pas à `Declaration` : le fichier impose son placement avant les
déclarations.

## 1. Unions exhaustives

Les familles de nœuds doivent être représentées par des **unions discriminées TypeScript**.

```ts
export type Declaration =
  | VariableDeclarationZeroValue
  | VariableDeclarationInitialized
  | ConstantDeclaration
  | TypeDeclaration
  | TypeAliasDeclaration
  | FunctionDeclaration
  | MethodDeclaration;
```

Les groupes de tags `NodeGroup`, `DeclarationGroup`, `ExpressionGroup`,
`StatementGroup` et `TypeGroup` décrivent l'appartenance des nœuds. Ils ne
remplacent pas les unions concrètes dans les propriétés de l'AST.

Lorsqu'un nœud est ajouté, l'union correspondante doit être mise à jour.

Composer les sélections locales à partir de groupes sémantiques identifiés :

- `Type`, défini dans `type/base.ts`, regroupe toutes les
  constructions de types.
- `TypeReference`, défini dans `common/typeReference.ts`, regroupe exactement
  `Identifier`, `PackageTypeReference` et `GenericTypeReference`. Il n'inclut
  pas les constructions de `Type`.

Utiliser un groupe directement lorsqu'il correspond exactement au besoin.
Créer une union locale pour combiner les groupes et nœuds nécessaires :

```ts
export type ArrayElementType = TypeReference | Type;

export type MapKeyType =
  | TypeReference
  | ArrayType
  | ChannelType
  | InterfaceType
  | PointerType
  | StructType;
```

N'utiliser un groupe que si tous ses membres sont acceptés. Lorsqu'un contexte
n'en accepte qu'une partie, énumérer cette sélection localement : par exemple,
`GenericTypeTarget` accepte `Identifier | PackageTypeReference`. Le receiver
d'une méthode accepte un identifiant, une référence générique ou un seul
pointeur vers l'une de ces deux formes. Ne pas élargir ces sélections avec le
groupe complet pour éviter une répétition.

Prévoir cette composition dès l'ajout d'un nœud : repérer les groupes adaptés,
puis décrire uniquement les exceptions propres au contexte. Les fichiers
`index.ts` servent uniquement aux réexports.

Si une union est actuellement définie avec `never`, il s'agit d'une implémentation incomplète.

## 2. Interfaces et factories

Chaque nœud concret possède une interface et une factory.

Utiliser `DModeling.createTaggedObjectFactory` et les groupes de tags existants.

```ts
import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier } from "../common";
import { type DeclarationGroup } from "./base";

export interface ExampleDeclaration extends DModeling.ObjectTagWithGroup<"example", DeclarationGroup> {
  identifier: Identifier;
}

export const exampleDeclaration = DModeling.createTaggedObjectFactory<
  ExampleDeclaration
>("[node][declaration]example");
```

Conventions :

- Une interface par construction syntaxique.
- Un discriminant unique porté par `ObjectTag`.
- Une factory pour chaque nœud concret.
- Ne pas introduire de classes.
- Conserver les tags et leur ordre, cohérents avec les groupes de l'interface.
- Respecter les conventions de nommage existantes.

## 3. Composition des nœuds

Un nœud doit référencer les familles grammaticales appropriées.

Exemples :

- Une initialisation utilise une `Expression`.
- Un corps de fonction utilise un `BlockStatement`.
- Un bloc contient des `Statement`.
- Une déclaration de type utilise `TypeReference | Type`.

Les nœuds doivent pouvoir être imbriqués lorsque la grammaire Go l'autorise.

Privilégier la réutilisation des nœuds existants plutôt que la duplication de structures.

Exception volontaire pour les signatures de fonctions : chaque nœud concerné
déclare directement ses propriétés `parameters`, `variadicParameter`,
`returnTypes` et, lorsqu'ils sont autorisés, ses paramètres génériques.
Ne pas créer de contrat de signature partagé. Les tuples `FunctionParameter`
et `TypeParameter` sont réutilisables lorsque les règles d'acceptation sont
identiques. Lorsqu'un contexte impose des restrictions, définir sa sélection
et son tuple localement, comme pour le receiver d'une méthode.

Les pointeurs sont des constructions de `Type`. `PointerType` conserve le
type de sa cible grâce à son paramètre générique et à la factory `pointerType`.
En contexte général, la cible accepte `TypeReference | Type`, donc les
pointeurs peuvent s'imbriquer. Un champ embarqué de struct accepte seulement
`TypeReference | PointerType<TypeReference>` ; un receiver utilise sa sélection
locale, qui exclut aussi les références de package. Ces contextes n'acceptent
pas de pointeur vers un autre pointeur ou vers une construction anonyme.

`TypeConstraint` représente le terme `~T`. Il appartient aux éléments
et unions d'interface ainsi qu'aux contraintes de paramètres génériques, jamais
à `Type` ou `TypeReference`. Sa cible n'accepte ni un autre terme `~`, ni une
union, ni un type interface littéral. `~*T` est représentable ; `*~T` et `~~T`
ne le sont pas. La validité d'une référence nommée après `~` dépend de la
résolution des noms, hors de la responsabilité de construction de cet AST.

## 4. Simplification syntaxique

Ne pas implémenter les syntaxes qui servent uniquement à raccourcir ou présenter le code.

Exemples initialement exclus :

- Déclarations groupées.
- Déclarations multiples de variables.
- Regroupement des imports.
- Raccourcis syntaxiques non indispensables.

En revanche, préserver les distinctions qui modifient le comportement du langage.

Par exemple :

- Variable initialisée ou à valeur zéro.
- Définition d'un type ou alias.
- Fonction ou méthode.

Ne pas créer de variantes uniquement parce qu'un nœud référence un `Identifier` plutôt qu'un type construit.

## 5. Validité locale et résolution des noms

L'AST construit une représentation syntaxique de Go. Ses interfaces et
factories encadrent les formes de nœuds et leurs combinaisons vérifiables
localement. Il ne garantit pas la validité du programme après résolution des
noms : cette vérification relève du compilateur ou d'une couche d'analyse
distincte. Le terme technique correspondant est « validation sémantique ».

Pour chaque restriction envisagée, distinguer deux cas :

- La règle se déduit de la structure disponible au point de construction :
  l'exprimer dans les propriétés et unions locales. Par exemple, exclure un
  terme `~` de la cible d'un pointeur et limiter un champ embarqué à un nom de
  type ou à un seul pointeur vers ce nom.
- La règle exige de connaître une déclaration désignée par un identifiant,
  de suivre un alias ou d'inspecter un package : ne pas la prendre en charge
  dans les types ni les factories de cet AST.

Lorsqu'une référence nommée est autorisée dans le cas général, la conserver
même si certaines déclarations qu'elle pourrait désigner rendraient le
programme invalide. Cette règle concerne les identifiants locaux comme les
références qualifiées et génériques. Ne pas déduire la nature d'une déclaration
de la seule forme de sa référence ou de l'orthographe de son nom.

Par exemple, `~Nom` ou `~pkg.Nom` peut être valide si le nom désigne un alias
approprié et invalide s'il désigne un type défini ou une interface. Conserver
`TypeReference` dans `TypeConstraintTarget` : ne pas exclure tous les noms pour
éviter les cas invalides. La comparabilité d'une clé nommée et la nature d'une
interface nommée visée par un pointeur suivent la même règle.

Ne pas introduire de génériques, variantes, preuves ou métadonnées destinés
uniquement à anticiper ces vérifications sur des déclarations distantes. Un
générique reste pertinent s'il conserve une information structurelle locale,
comme la cible concrète de `PointerType` pour un champ embarqué ou un receiver.
Ne pas ajouter de résolution des noms ni de registre de déclarations dans les
factories pour satisfaire une telle restriction.

## 6. Périmètre d'intervention

Lorsqu'un agent travaille sur un domaine :

1. Examiner les structures existantes.
2. Vérifier la syntaxe Go concernée.
3. Identifier les nœuds nécessaires.
4. Réutiliser les familles existantes.
5. Créer les interfaces et leurs factories.
6. Compléter les unions concernées.
7. Vérifier le typage et le lint.

Ne pas implémenter les domaines voisins sans nécessité.

Lorsqu'une dépendance manque dans un autre domaine, l'identifier explicitement plutôt qu'inventer une implémentation incorrecte.

Signaler une expression encore absente par un commentaire en français au-dessus
de l'emplacement concerné, par exemple `// Il manque une expression constante.`
Ne pas ajouter de README pour documenter les limites de cet AST.

## 7. Validation

Ne pas créer ni maintenir de tests pour cet AST. Vérifier uniquement le typage
du code source et le lint avec les commandes existantes ci-dessous.

Utiliser les commandes existantes :

```bash
pnpm test:types
pnpm test:lint
```

Respecter les conventions de `@duplojs/lang` et les skills DuploJS installés.

Ne pas utiliser `any` pour contourner une erreur de typage.

## 8. Références

En cas de doute sur la syntaxe Go, consulter la spécification officielle :

https://go.dev/ref/spec

L'AST officiel de Go peut servir de référence conceptuelle :

https://pkg.go.dev/go/ast

Il ne doit pas nécessairement être reproduit à l'identique.
