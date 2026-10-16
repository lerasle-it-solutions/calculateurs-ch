import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Utilitaires partagés des tests post-construction (tests/build/). */
export const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));

/** Toutes les pages HTML d'un dossier, récursivement. */
export const htmlFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith(".html") ? [path] : [];
	});

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&#39;": "'", "&#x27;": "'", "&apos;": "'", "&amp;": "&", "&#8239;": " ", "&#160;": " " };

/** Texte visible d'une page : sans scripts, styles ni balises, entités décodées. */
export const pageText = (html: string): string =>
	html
		.replace(/<script\b[\s\S]*?<\/script>/g, " ")
		.replace(/<style\b[\s\S]*?<\/style>/g, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&(?:nbsp|#39|#x27|apos|amp|#8239|#160);/g, (entity) => ENTITIES[entity] ?? entity);
