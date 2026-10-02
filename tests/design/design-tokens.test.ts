/**
 * Garde-fou du design system (docs/design-system.md § 3.4).
 *
 * Toute valeur de couleur, taille, espacement, rayon ou ombre vient de
 * src/styles/tokens.css. Ce test échoue si un composant, une page ou un
 * gabarit contourne les tokens par une valeur arbitraire Tailwind
 * (`text-[17px]`, `bg-[#fff]`, `rounded-[3px]`…) ou un style en ligne coloré.
 *
 * Les gabarits de grille (`grid-cols-[2fr_3fr]`) restent autorisés : ils
 * décrivent une structure, pas une valeur de design.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src/components", "src/layouts", "src/pages"];
const EXTENSIONS = [".astro", ".ts", ".html", ".md", ".mdx"];

const FORBIDDEN: Array<{ name: string; pattern: RegExp }> = [
	{
		name: "couleur arbitraire",
		pattern:
			/\b(?:bg|text|border(?:-[trblxy])?|fill|stroke|outline|ring|decoration|divide|from|via|to|shadow|accent|caret|placeholder)-\[(?:#|rgb|hsl|oklch|color:)/,
	},
	{
		name: "taille, espacement, rayon ou ombre arbitraire",
		pattern:
			/\b(?:text|leading|tracking|font|p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy]|rounded(?:-[trblse]{1,2})?|shadow|max-w|min-w|min-h|max-h|size)-\[[^\]]*\d/,
	},
	{
		name: "couleur littérale dans un attribut style",
		pattern: /style=(?:"[^"]*|'[^']*|\{[^}]*)(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/,
	},
	{
		name: "palette Tailwind par défaut",
		pattern:
			/\b(?:bg|text|border|fill|stroke|ring|outline|divide|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/,
	},
];

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) return walk(path);
		return EXTENSIONS.some((ext) => path.endsWith(ext)) ? [path] : [];
	});
}

describe("design system — aucune valeur littérale hors tokens.css", () => {
	const files = ROOTS.flatMap((root) => walk(root));

	it("trouve des fichiers à vérifier", () => {
		expect(files.length).toBeGreaterThan(0);
	});

	for (const file of files) {
		it(relative(process.cwd(), file), () => {
			const lines = readFileSync(file, "utf8").split("\n");
			const violations = lines.flatMap((line, index) =>
				FORBIDDEN.filter(({ pattern }) => pattern.test(line)).map(
					({ name }) => `ligne ${index + 1} — ${name} : ${line.trim()}`,
				),
			);
			expect(violations, "Ajoute le token manquant dans src/styles/tokens.css").toEqual([]);
		});
	}
});
