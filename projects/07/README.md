# Projet 07

## Problématique

### Enchaîner des opérations dépendantes

Dans `index.ts`, `DEither.rightPipe` reçoit le résultat de `add`, puis transmet sa valeur à `divide`. Cette seconde opération peut aussi échouer. Comment enchaîner des opérations qui dépendent les unes des autres, en interrompant la suite dès qu’une étape produit un échec et en conservant cet échec dans le résultat final ?

## Notre étude

### Exercice 07

**Problèmes étudiés**

1. Traduire `DEither.rightPipe(add(1, 2), (value) => divide(value, 0))` : enchaîner des
   opérations qui peuvent échouer, et s'arrêter au premier échec en le gardant.
2. Le type de `divide` : `Left<"division-by-zero", 0> | Success<number>`, avec le type
   **littéral** `0`.
3. `matchInformation` à trois informations, dont un traitement passé par son nom
   (`success: DString.to`).
4. La division `value / divisor`.

**Solution**

Go généré (`brouillons/variations-07`) :

```go
Generated_6 := Generated_3(Generated_4, Generated_5)    // add(1, 2) : l'Either d'entrée
if Generated_6.IsRight {                               // étape (value) => divide(value, 0)
	Sourced_value := Generated_6.Right
	_ = Sourced_value
	Generated_7 := …Sourced_divide
	Generated_8 := Sourced_value
	Generated_9 := (float64)(0)
	Generated_6 = Generated_7(Generated_8, Generated_9)
}
Sourced_result := Generated_6
```

et, dans un `matchInformation`, un traitement passé par son nom :

```go
case "success":
	Generated_32 = Sourced_double(Generated_31.Right)
```

- **`rightPipe`** (`either/rightPipe`) : pas de fonction anonyme (décision n°5). L'Either d'entrée
  est rangé dans une variable (l'« accumulateur »), et chaque étape devient **un `if`** : « si
  c'est encore un succès, calcule l'étape suivante avec sa valeur ». Dès qu'une étape échoue, les
  `if` suivants sont sautés et l'échec est gardé, comme en TS.
- **Condition** : l'entrée, chaque étape et le résultat doivent avoir le même type Go (ici
  `Either[float64, float64]`), sinon le build s'arrête (`either-right-pipe-types-differ`). C'est
  le cas dans les exercices 07, 08 et 10 (vérifié avec le checker, `brouillons/explore-vars.ts`).
- **Type littéral `0`** (`type/numberLiteral.ts`) : après `divisor === 0`, TS sait que `divisor`
  vaut 0. Go n'a pas de types littéraux : `0` devient `float64`. Les deux Left (`number` et `0`)
  ont donc le même type Go, et un seul `L` suffit.
- **Un helper commun pour les fonctions passées en argument** (`common/inlineCallback.ts`) :
  `rightPipe` et `matchInformation` recopient le code de la fonction en ligne, qu'elle soit écrite
  `(x) => …` ou passée par son nom (`double` -> `Sourced_double(valeur)`). Les fonctions
  `whenIsRight`, `whenIsRightOtherwise` et `DArray.map` (autres chantiers) peuvent le réutiliser :
  toute l'équipe génère ainsi le même Go.
- **Division** : comme les autres opérations, elle porte sur des variables. Go calcule alors à
  l'exécution, comme JS (`x / 0` donne `+Inf`). Avec deux constantes, `1 / 0` ne compile même pas
  en Go (« division by zero ») : vérifié.

**Variations envisagées** (`brouillons/variations-07`)

- Fonctionnent, avec une sortie identique à TS (18 lignes) : `add` réussit puis `divide` échoue ;
  `add` échoue (l'étape `divide` n'est pas exécutée, l'échec `negative-operand` est gardé) ; tout
  réussit (`(4 + 5) / 3`) ; `matchInformation` à trois informations avec un traitement passé par son
  nom (`success: double`), sur un échec et sur un succès.
- Refusées avec une erreur explicite : étape qui renvoie une valeur brute au lieu d'un Either
  (`either-right-pipe-types-differ`), étape écrite avec un bloc `{ return … }`
  (`callback-not-supported-yet`).

**Résultat observé**

- Partie Either (`divide.ts`, `rightPipe`, `matchInformation`) : sortie Go identique à la sortie
  TS, **oui**.
- Exercice complet (`./scripts/compare.sh 07`) : **pas encore**. `index.ts` utilise `DCommon.pipe`,
  `whenIsRightOtherwise`, `DArray.map` et `DString.to` (exercices 02 à 05, autres chantiers) ; le
  build s'arrête avec l'erreur explicite `common-function-not-supported-yet`.

```bash
pnpm build --tsconfig brouillons/variations-07/tsconfig.json --input brouillons/variations-07/index.ts --output /tmp/v07
cd /tmp/v07 && go run . | diff - ~/Desktop/hackaton/brouillons/variations-07/attendu.txt
```

**Limites**

- `rightPipe` : une étape qui renvoie une valeur brute (que TS emballe dans `success()`), ou un
  Either d'un autre type, demanderait une conversion ; refusé pour l'instant.
- Le résultat `message` de `index.ts` a le type `string | (string & Number)` (à cause de
  `DString.to`) : il faudra traduire ce type « marqué » en `string` (chantier 4).
- Une fonction passée par son nom doit avoir une seule signature et au plus un paramètre.

**À vérifier**

- Les variables `Sourced_value` et `_ = …` de chaque étape ne coûtent rien une fois compilées :
  supposé, pas mesuré ici.
