/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Tests unitaires (données, calculs, composants). La configuration Vite d'Astro
// compile les composants .astro, rendus par l'API conteneur, et fournit
// `import.meta.glob`, utilisé par src/data/index.ts pour découvrir les JSON.
export default getViteConfig({
	test: {
		// tests/build/, la charte rédactionnelle et les balises lues par Bing examinent dist/ : lancés après la construction
		// (`postbuild`), avec VITEST_DIST=1.
		include: process.env.VITEST_DIST ? ["tests/build/**/*.test.ts", "tests/content/editorial.test.ts", "tests/seo/bing.test.ts"] : ["tests/**/*.test.ts"],
		exclude: process.env.VITEST_DIST ? [] : ["tests/build/**", "tests/content/editorial.test.ts", "tests/seo/bing.test.ts", "**/node_modules/**"],
		environment: "node",
		// Collections de contenu synchronisées avant les tests (articles MDX).
		globalSetup: ["tests/setup/content-store.ts"],
	},
});
