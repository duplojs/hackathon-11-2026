// DArray.map en forme DIRECTE, avec une fonction fléchée puis avec DString.to passé en valeur.
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

const values: number[] = [1, 2.5, -3];

DCommon.print(DArray.map(values, (value) => value * 2));
DCommon.print(DArray.map(values, DString.to));

const empty: number[] = [];

DCommon.print(DArray.map(empty, DString.to));
