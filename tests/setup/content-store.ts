/**
 * Préparation globale de Vitest : les collections de contenu (articles).
 *
 * Vitest lance Vite en mode développement ; `astro:content` y lit
 * .astro/data-store.json, alors qu'`astro sync` écrit le magasin de données
 * dans le cache de construction (node_modules/.astro/). On synchronise, puis on
 * place le magasin là où le mode développement l'attend : sans cela,
 * getCollection renverrait une collection vide et les tests (liens internes,
 * méta-descriptions, sitemap, fiche des articles) ne verraient aucun article.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default async function setup(): Promise<void> {
	const root = new URL("../../", import.meta.url);
	execFileSync(process.execPath, [fileURLToPath(new URL("node_modules/astro/bin/astro.mjs", root)), "sync"], {
		cwd: fileURLToPath(root),
		stdio: "ignore",
	});
	const built = fileURLToPath(new URL("node_modules/.astro/data-store.json", root));
	const dev = fileURLToPath(new URL(".astro/", root));
	if (!existsSync(built)) throw new Error("Magasin de données des collections introuvable après astro sync.");
	mkdirSync(dev, { recursive: true });
	copyFileSync(built, `${dev}data-store.json`);
}
