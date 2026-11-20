import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

console.log("=== number ===");
DCommon.print(42);

console.log("=== string ===");
DCommon.print("hello");

console.log("=== array ===");
DCommon.print([1, 2, 3]);

console.log("=== Either success ===");
DCommon.print(DEither.success(3));

console.log("=== Either fail ===");
DCommon.print(DEither.fail());

console.log("=== Left avec information ===");
DCommon.print(DEither.left("negative-operand", -1));

console.log("=== return value (print renvoie son entrée) ===");
const returned = DCommon.print("echo-me");
console.log("returned ===", JSON.stringify(returned));
