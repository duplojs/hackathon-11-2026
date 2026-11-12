import { engineConfig, createOxlintOverride, oxlint } from "@duplojs/code-config/oxlint";

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
	],
});
