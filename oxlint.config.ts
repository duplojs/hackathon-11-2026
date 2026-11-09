import { engineConfig, createOxlintOverride, oxlint } from "@duplojs/code-config/oxlint";

export default oxlint.defineConfig({
	extends: [engineConfig],
	overrides: [
		createOxlintOverride({
			files: ["src/**", "oxlint.config.ts"],
			ruleset: { open: true },
		}),
	],
});
