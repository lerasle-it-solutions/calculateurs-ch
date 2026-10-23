import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Utilitaires partagés des tests post-construction (tests/build/). */
export const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));

/** Toutes les pages HTML d'un dossier, récursivement. */
export const htmlFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith(".html") ? [path] : [];
	});

/** Chemin public d'un fichier de dist/ : `a/b/index.html` → `/a/b/`, `404.html` → `/404/`. */
export const publicPath = (file: string): string => {
	const parts = relative(DIST, file).split(sep);
	const last = parts.pop() as string;
	if (last !== "index.html") parts.push(last.replace(/\.html$/, ""));
	return parts.length === 0 ? "/" : `/${parts.join("/")}/`;
};

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&#39;": "'", "&#x27;": "'", "&apos;": "'", "&amp;": "&", "&#8239;": " ", "&#160;": " " };

/** Texte visible d'une page : sans scripts, styles ni balises, entités décodées. */
export const pageText = (html: string): string =>
	html
		.replace(/<script\b[\s\S]*?<\/script>/g, " ")
		.replace(/<style\b[\s\S]*?<\/style>/g, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&(?:nbsp|#39|#x27|apos|amp|#8239|#160);/g, (entity) => ENTITIES[entity] ?? entity);
