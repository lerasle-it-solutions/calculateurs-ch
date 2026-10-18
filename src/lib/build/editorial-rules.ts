/**
 * Règles de la charte rédactionnelle (docs/editorial-style.md) appliquées au
 * texte visible : contrôles bloquants (§ 6.1, tests/content/editorial.test.ts)
 * et mesures du rapport indicatif (§ 6.2, `npm run copy:report`).
 *
 * La liste des tournures interdites n'est pas recopiée ici : elle est lue dans
 * la table du § 4.3 de la charte, seule source.
 */
import type { TextBlock } from "./visible-text";

export type ForbiddenPhrase = { phrase: string; pattern: RegExp };

/** `\b` au sens Unicode : « résumé » finit sur une lettre, même accentuée. */
const UNICODE_BOUNDARY = "(?:(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}])|(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}]))";

/**
 * Lignes de la table « Tournures interdites » de la charte : `| Tournure | `motif` |`.
 * Une ligne « relecture » n'a pas de motif. Dans une cellule, `\|` vaut `|`.
 */
export function parseForbiddenPhrases(charter: string): ForbiddenPhrase[] {
	const section = /^### 4\.3 Tournures interdites$([\s\S]*?)^#{2,3} /m.exec(charter)?.[1];
	if (!section) throw new Error("docs/editorial-style.md : table « 4.3 Tournures interdites » introuvable");
	return section
		.split("\n")
		.map((line) => /^\|\s*(.+?)\s*\|\s*`(.+)`\s*\|\s*$/.exec(line))
		.filter((match): match is RegExpExecArray => match !== null)
		.map(([, phrase, source]) => ({
			phrase: phrase!,
			pattern: new RegExp(source!.replaceAll("\\|", "|").replaceAll("\\b", UNICODE_BOUNDARY), "iu"),
		}));
}

export type Violation = { rule: string; excerpt: string };

const excerpt = (text: string, index: number, length: number): string =>
	`${index > 30 ? "…" : ""}${text.slice(Math.max(0, index - 30), index + length + 30)}${index + length + 30 < text.length ? "…" : ""}`;

/** Contrôles bloquants du § 6.1 sur un bloc de texte visible. */
export function blockViolations(text: string, forbidden: ForbiddenPhrase[]): Violation[] {
	const found: Violation[] = [];
	const scan = (rule: string, pattern: RegExp) => {
		for (const match of text.matchAll(pattern)) found.push({ rule, excerpt: excerpt(text, match.index, match[0].length) });
	};
	scan("tiret cadratin (U+2014)", /—/g);
	scan("tiret demi-cadratin (U+2013)", /–/g);
	scan("trait d'union isolé entre deux espaces", /(?<=^|\s)-(?=\s|$)/g);
	scan("point d'exclamation", /!/g);
	for (const { phrase, pattern } of forbidden) {
		const match = pattern.exec(text);
		if (match) found.push({ rule: `tournure interdite ${phrase}`, excerpt: excerpt(text, match.index, match[0].length) });
	}
	return found;
}

// ─── Rapport indicatif (§ 6.2) ────────────────────────────────────────────────

/** Abréviations suivies d'un point qui ne terminent pas une phrase (références légales surtout). */
const ABBREVIATIONS = new Set(["art", "al", "ch", "let", "n", "p", "ex", "cf", "env", "etc", "chap", "rs", "st", "ss", "vol", "mme", "m", "no", "réf", "min", "max", "ca", "resp", "cc"]);

/** Découpe un bloc en phrases : fin sur `.`, `?`, `!` ou `…` suivis d'une majuscule, d'un guillemet ou d'une parenthèse. */
export function sentences(text: string): string[] {
	const result: string[] = [];
	let start = 0;
	for (const match of text.matchAll(/([.?!…])[\s  ]+(?=[«(\p{Lu}\d])/gu)) {
		const end = match.index + 1;
		const before = /([\p{L}]+)\.$/u.exec(text.slice(start, end));
		if (match[1] === "." && before && ABBREVIATIONS.has(before[1]!.toLowerCase())) continue;
		result.push(text.slice(start, end).trim());
		start = end;
	}
	const rest = text.slice(start).trim();
	if (rest !== "") result.push(rest);
	return result;
}

/** Nombre de mots : suites séparées par des blancs, ponctuation isolée exclue (« : », « » »). */
export const wordCount = (sentence: string): number =>
	sentence.split(/[\s  ]+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;

/** Préfixes imposés par le design system (§ 3.2 de la charte), hors du décompte des deux-points. */
const MANDATORY_PREFIX = /(?:Attention|Erreur|Envoyé)[\s  ]*:/gu;
export const colonCount = (text: string): number => (text.replace(MANDATORY_PREFIX, "").match(/:/g) ?? []).length;

/** Blocs lus comme des paragraphes pour le rythme et les deux-points. */
const PARAGRAPH_TAGS = new Set(["p", "li", "dd", "blockquote", "figcaption", "@meta"]);
/** Blocs examinés pour la longueur des phrases : les paragraphes, plus les cellules de tableau et les intitulés. */
const SENTENCE_TAGS = new Set([...PARAGRAPH_TAGS, "td", "th", "summary", "label", "legend", "h1", "h2", "h3", "h4", "caption", "title"]);

export const LONG_SENTENCE_WORDS = 35;
export const MIN_SENTENCES_FOR_RHYTHM = 3;
export const MIN_LENGTH_SPREAD = 4;

export type CopyFindings = {
	longSentences: { words: number; sentence: string }[];
	uniformParagraphs: { lengths: number[]; paragraph: string }[];
	colonHeavyParagraphs: { colons: number; paragraph: string }[];
};

/** Mesures du rapport sur les blocs d'une page ; un bloc répété (en-tête, pied de page) n'est compté qu'une fois. */
export function copyFindings(blocks: TextBlock[]): CopyFindings {
	const findings: CopyFindings = { longSentences: [], uniformParagraphs: [], colonHeavyParagraphs: [] };
	const seen = new Set<string>();
	for (const { tag, text } of blocks) {
		if (seen.has(text)) continue;
		seen.add(text);
		const parts = sentences(text);
		if (SENTENCE_TAGS.has(tag)) {
			for (const sentence of parts) {
				const words = wordCount(sentence);
				if (words > LONG_SENTENCE_WORDS) findings.longSentences.push({ words, sentence });
			}
		}
		if (!PARAGRAPH_TAGS.has(tag)) continue;
		if (parts.length >= MIN_SENTENCES_FOR_RHYTHM) {
			const lengths = parts.map(wordCount);
			if (Math.max(...lengths) - Math.min(...lengths) < MIN_LENGTH_SPREAD) findings.uniformParagraphs.push({ lengths, paragraph: text });
		}
		const colons = colonCount(text);
		if (colons > 1) findings.colonHeavyParagraphs.push({ colons, paragraph: text });
	}
	return findings;
}
