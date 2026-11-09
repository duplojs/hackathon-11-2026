import { engineConfig, createOxlintOverride, oxlint, defaultPreferNamespaceImportPaths } from "@duplojs/code-config/oxlint";

export default oxlint.defineConfig({
	extends: [engineConfig],
	overrides: [
		createOxlintOverride({
			files: [
				"src/**",
				"projects/**",
				"bin/**",
				"oxlint.config.ts",
			],
			ruleset: { open: true },
		}),
		createOxlintOverride({
			files: ["src/**"],
			ruleset: { base: false },
			customRules: {
				"duplojs-plugin/prefer-namespace-import": [
					"error",
					{
						paths: {
							"@go": "GO",
							...defaultPreferNamespaceImportPaths,
						},
					},
				],
			},
		}),
	],
});
