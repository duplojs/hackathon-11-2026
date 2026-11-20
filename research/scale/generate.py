"""Génère un projet TS synthétique de taille réglable (sans cycle), pour mesurer le transpileur."""
import os, sys
out, files = sys.argv[1], int(sys.argv[2])
os.makedirs(out, exist_ok=True)
open(f"{out}/tsconfig.json", "w").write('{\n\t"extends": "@duplojs/code-config/tsconfig/base.json",\n\t"include": ["*.ts"]\n}\n')
for i in range(files):
    open(f"{out}/m{i}.ts", "w").write(f'''import * as DEither from "@duplojs/lang/either";
import * as DString from "@duplojs/lang/string";

export function parse{i}(raw: number) {{
	if (raw < 0) {{
		return DEither.left("negative-{i}", raw);
	}}
	if (raw % 2 !== 0) {{
		return DEither.left("odd-{i}", "impair");
	}}
	return DEither.success(raw * {i + 1});
}}

export function label{i}(value: string | number) {{
	if (typeof value === "string") {{
		return value;
	}}
	return DString.to(value);
}}

export function step{i}(raw: number) {{
	return DEither.rightPipe(parse{i}(raw), (value) => DEither.success(value + 1));
}}

export function describe{i}(raw: number) {{
	return DEither.matchInformation(step{i}(raw), {{
		"negative-{i}": (value) => label{i}(value),
		"odd-{i}": (text) => label{i}(text),
		success: (value) => label{i}(value),
	}});
}}
''')
imports = "\n".join(f'import {{ describe{i} }} from "./m{i}";' for i in range(files))
calls = "\n".join(f"DCommon.print(describe{i}({i % 5 - 1}));" for i in range(files))
open(f"{out}/index.ts", "w").write(f'import * as DCommon from "@duplojs/lang/common";\n{imports}\n\n{calls}\n')
