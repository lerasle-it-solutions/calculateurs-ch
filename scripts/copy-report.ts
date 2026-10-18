/**
 * Rapport de style du texte visible (docs/editorial-style.md § 6.2).
 *
 *   npm run copy:report            → lit dist/
 *   npm run copy:report -- <dossier>  → lit un autre dossier construit
 *
 * Indicatif : il ne fait jamais échouer la construction, même sans dist/.
 * Page par page : phrases de plus de 35 mots, paragraphes de trois phrases ou
 * plus aux longueurs trop proches, paragraphes de plus d'un deux-points.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { copyFindings, LONG_SENTENCE_WORDS, MIN_LENGTH_SPREAD } from "../src/lib/build/editorial-rules";
import { visibleBlocks } from "../src/lib/build/visible-text";

const root = resolve(process.argv[2] ?? "dist");

const htmlFiles = (dir: string): string[] =>
	readdirSync(dir)
		.sort()
		.flatMap((entry) => {
			const path = join(dir, entry);
			return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith(".html") ? [path] : [];
		});

const shorten = (text: string, max = 160): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

try {
	if (!existsSync(root)) {
		console.log(`copy:report : ${root} introuvable, lancer d'abord npm run build.`);
	} else {
		const totals = { pages: 0, longSentences: 0, uniformParagraphs: 0, colonHeavyParagraphs: 0 };
		for (const file of htmlFiles(root)) {
			const findings = copyFindings(visibleBlocks(readFileSync(file, "utf8")));
			const count = findings.longSentences.length + findings.uniformParagraphs.length + findings.colonHeavyParagraphs.length;
			totals.pages += 1;
			totals.longSentences += findings.longSentences.length;
			totals.uniformParagraphs += findings.uniformParagraphs.length;
			totals.colonHeavyParagraphs += findings.colonHeavyParagraphs.length;
			console.log(`\n## ${relative(root, file)} (${count})`);
			for (const { words, sentence } of findings.longSentences) console.log(`- phrase de ${words} mots : ${shorten(sentence)}`);
			for (const { lengths, paragraph } of findings.uniformParagraphs)
				console.log(`- rythme uniforme (${lengths.join(", ")} mots) : ${shorten(paragraph)}`);
			for (const { colons, paragraph } of findings.colonHeavyParagraphs) console.log(`- ${colons} deux-points : ${shorten(paragraph)}`);
		}
		const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;
		console.log(
			`\nTotal, ${totals.pages} pages : ${plural(totals.longSentences, "phrase")} de plus de ${LONG_SENTENCE_WORDS} mots, ` +
				`${plural(totals.uniformParagraphs, "paragraphe")} au rythme uniforme (écart < ${MIN_LENGTH_SPREAD} mots), ` +
				`${plural(totals.colonHeavyParagraphs, "paragraphe")} de plus d'un deux-points.`,
		);
	}
} catch (error) {
	// Indicatif : une erreur se signale, elle n'arrête rien
	console.log(`copy:report : rapport interrompu (${error instanceof Error ? error.message : String(error)}).`);
}
process.exitCode = 0;
