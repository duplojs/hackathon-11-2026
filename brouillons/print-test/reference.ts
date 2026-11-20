// Référence Node : mêmes valeurs que go/main.go, affichées avec DCommon.print.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const p = DCommon.print;
p(3); p(-0); p(1.5); p(1e21); p(1e-7); p(0.000001); p(0.1 + 0.2); p(NaN); p(-Infinity);
p(123456789012); p(1e300); p(5e-324); p(-123.456); p(2 ** 53); p(1 / 3);
p("abc"); p(["abc"]); p(["it's"]); p(["it's \"x\""]); p(["it's \"x\" `y`"]); p(["a\\b\tc"]);
p(["é", "日本", "😀"]); p([]); p([1, 2, 3]); p([true, false]);
p([1.5, -0, 1e21, 1e-7, 0.1 + 0.2, NaN, -Infinity, 123456789012]);
p(Array.from({ length: 26 }, (_, i) => i * 7));
p(Array.from({ length: 30 }, (_, i) => "item" + i));
p(Array.from({ length: 120 }, (_, i) => i));
p([[1, [2, [3, [4]]]]]);
p(["ligne un qui est assez longue\nligne deux qui est aussi assez longue\nligne trois qui termine"]);
p(DEither.success(3)); p(DEither.fail()); p(DEither.left("division-by-zero", 0));
p(DEither.right("success", 3)); p([DEither.success(1), DEither.fail()]);
p(DEither.success([1, 2, 3])); p(DEither.success("txt")); p(DEither.success(["a", "b"]));
p([[DEither.success(1)]]); p([[[DEither.success(1)]]]);
