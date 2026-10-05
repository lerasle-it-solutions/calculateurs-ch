/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Tests unitaires (données, calculs, composants). La configuration Vite d'Astro
// compile les composants .astro, rendus par l'API conteneur, et fournit
// `import.meta.glob`, utilisé par src/data/index.ts pour découvrir les JSON.
export default getViteConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
		// Collections de contenu synchronisées avant les tests (articles MDX).
		globalSetup: ["tests/setup/content-store.ts"],
	},
});
