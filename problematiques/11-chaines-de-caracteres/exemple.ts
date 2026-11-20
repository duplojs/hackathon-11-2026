import * as DString from "@duplojs/lang/string";

const digits = /[0-9]/;

console.log(DString.to(3));
console.log(DString.to(0.5));
console.log(DString.test("abc1", digits));
console.log(DString.includes("a@b", "@"));
console.log(DString.length("été"));
console.log(DString.length("😀"));
