/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

// Tests unitaires (données + calculs). Vite fournit `import.meta.glob`,
// utilisé par src/data/index.ts pour découvrir les fichiers JSON.
export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
});
