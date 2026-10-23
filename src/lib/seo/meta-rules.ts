/**
 * Règles des balises lues par Bing (prompt SEO du 23.10.2026, étape 2).
 *
 * Limites dures, qui font échouer la construction (tests/seo/bing.test.ts) :
 * Bing signale un title de plus de 70 caractères et une méta-description de
 * plus de 160. Cibles, signalées sans bloquer : title de moins de 60
 * caractères, méta-description de 120 à 150 (docs/editorial-style.md § 5).
 * Les longueurs se comptent en caractères ; un dépassement en octets UTF-8 est
 * signalé à part, Bing ne disant pas lequel des deux il mesure.
 */
export const TITLE_HARD_MAX = 70;
export const TITLE_TARGET_BELOW = 60;
export const DESCRIPTION_HARD_MAX = 160;
export const DESCRIPTION_TARGET_MIN = 120;
export const DESCRIPTION_TARGET_MAX = 150;

const characters = (text: string): number => [...text].length;
const bytes = (text: string): number => new TextEncoder().encode(text).length;

export type MetaCheck = { errors: string[]; warnings: string[] };

export const checkMeta = (title: string, description: string): MetaCheck => {
	const errors: string[] = [];
	const warnings: string[] = [];
	const titleLength = characters(title.trim());
	const descriptionLength = characters(description.trim());

	if (titleLength === 0) errors.push("title vide");
	else if (titleLength > TITLE_HARD_MAX) errors.push(`title de ${titleLength} caractères, plus de ${TITLE_HARD_MAX}`);
	else if (titleLength >= TITLE_TARGET_BELOW) warnings.push(`title de ${titleLength} caractères, cible : moins de ${TITLE_TARGET_BELOW}`);

	if (descriptionLength === 0) errors.push("méta-description vide");
	else if (descriptionLength > DESCRIPTION_HARD_MAX) errors.push(`méta-description de ${descriptionLength} caractères, plus de ${DESCRIPTION_HARD_MAX}`);
	else if (descriptionLength < DESCRIPTION_TARGET_MIN || descriptionLength > DESCRIPTION_TARGET_MAX) {
		warnings.push(`méta-description de ${descriptionLength} caractères, cible : de ${DESCRIPTION_TARGET_MIN} à ${DESCRIPTION_TARGET_MAX}`);
	}

	if (titleLength <= TITLE_HARD_MAX && bytes(title) > TITLE_HARD_MAX) warnings.push(`title de ${bytes(title)} octets UTF-8, plus de ${TITLE_HARD_MAX}`);
	if (descriptionLength <= DESCRIPTION_HARD_MAX && bytes(description) > DESCRIPTION_HARD_MAX) {
		warnings.push(`méta-description de ${bytes(description)} octets UTF-8, plus de ${DESCRIPTION_HARD_MAX}`);
	}
	return { errors, warnings };
};

/** Mots en minuscules, sans ponctuation ni le nom du site. */
const words = (text: string): string[] =>
	text
		.toLocaleLowerCase("fr-CH")
		.replace(/calculateurs\.ch/g, " ")
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);

/**
 * La description répète le title : elle le contient en entier, ou elle s'ouvre
 * sur ses deux premiers mots (un seul si le title n'en a qu'un).
 */
export const repeatsTitle = (title: string, description: string): boolean => {
	const head = words(title);
	const text = words(description);
	if (head.length === 0) return false;
	if (text.join(" ").includes(head.join(" "))) return true;
	const opening = head.slice(0, 2);
	return opening.every((word, index) => text[index] === word);
};

/** Sauts de niveau de titre, dans l'ordre du document : le premier titre est un H1, aucun niveau sauté en descendant. */
export const headingJumps = (levels: number[]): string[] => {
	const jumps: string[] = [];
	levels.forEach((level, index) => {
		const previous = index === 0 ? 0 : levels[index - 1]!;
		if (level > previous + 1) jumps.push(index === 0 ? `début → h${level}` : `h${previous} → h${level}`);
	});
	return jumps;
};

/** Date et heure ISO 8601 au format W3C des sitemaps, fuseau obligatoire. */
export const isW3cDatetime = (value: string): boolean => {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
	if (!match) return false;
	const [month, day, hour, minute] = [match[2], match[3], match[4], match[5]].map(Number);
	return month! >= 1 && month! <= 12 && day! >= 1 && day! <= 31 && hour! <= 23 && minute! <= 59 && !Number.isNaN(Date.parse(value));
};
