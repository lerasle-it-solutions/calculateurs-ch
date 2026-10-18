/**
 * Texte visible d'une page construite, bloc par bloc : ce que lit un visiteur,
 * pas le code. Sert au garde-fou rédactionnel (tests/content/editorial.test.ts)
 * et au rapport de style (`npm run copy:report`), docs/editorial-style.md § 5.
 *
 * Exclus : scripts (y compris le JSON de données des pages), styles,
 * commentaires, code (`<code>`, `<pre>`, `<kbd>`, `<samp>`) et éléments
 * `hidden`, invisibles tant qu'un script ne les montre pas. Inclus : le titre
 * de la page, la méta-description et les textes de partage, et les attributs
 * lus par un humain ou par un lecteur d'écran (`alt`, `aria-label`, `title`,
 * `placeholder`). Aucun autre attribut n'est lu : un attribut technique ne
 * s'affiche pas.
 *
 * Analyse par expressions régulières : le HTML vient d'Astro, bien formé ;
 * aucune dépendance n'est ajoutée pour un analyseur.
 */

export type TextBlock = {
	/** Élément qui porte le texte (`p`, `li`, `h2`…), ou `@alt`, `@aria-label`, `@title`, `@meta` pour un attribut. */
	tag: string;
	text: string;
};

/** Éléments qui ouvrent un bloc de texte : leur contenu ne se mêle pas à celui de leurs voisins. */
const BLOCK_TAGS = new Set([
	"address", "article", "aside", "blockquote", "body", "caption", "dd", "details", "div", "dl", "dt", "fieldset",
	"figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "html", "label",
	"legend", "li", "main", "nav", "ol", "optgroup", "option", "output", "p", "section", "select", "summary", "table",
	"tbody", "td", "text", "tfoot", "th", "thead", "title", "tr", "ul", "svg", "g", "button",
]);
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
/** Éléments de mise en forme dans la ligne : leurs bornes ne séparent pas deux mots. */
const INLINE_TAGS = new Set(["a", "abbr", "b", "bdi", "cite", "em", "i", "mark", "q", "s", "small", "strong", "sub", "sup", "time", "u"]);
const SKIPPED_TAGS = new Set(["script", "style", "code", "pre", "kbd", "samp", "template", "noscript"]);
/** Attributs lus par un humain ou un lecteur d'écran. */
const HUMAN_ATTRIBUTES = ["alt", "aria-label", "title", "placeholder"];
/** Balises meta dont le contenu s'affiche dans un moteur de recherche ou un aperçu de partage. */
const SHARED_META = /^(?:description|og:title|og:description|twitter:title|twitter:description)$/;

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘",
	mdash: "—", ndash: "–", hellip: "…", thinsp: " ", minus: "−",
};

/** Décode les entités nommées courantes et toutes les entités numériques. */
export const decodeEntities = (text: string): string =>
	text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, code: string) => {
		if (code[0] === "#") {
			const point = code[1] === "x" || code[1] === "X" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
			return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
		}
		return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
	});

const attribute = (tag: string, name: string): string | undefined => {
	const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
	return match ? decodeEntities(match[1] ?? match[2] ?? "") : undefined;
};
const hasAttribute = (tag: string, name: string): boolean => new RegExp(`\\s${name}(?:\\s*=|[\\s/>])`, "i").test(tag);

/** Espaces normalisées : les insécables restent des espaces, mais un seul blanc sépare deux mots. */
const squash = (text: string): string => text.replace(/[ \t\r\n\f]+/g, " ").trim();

export function visibleBlocks(html: string): TextBlock[] {
	const blocks: TextBlock[] = [];
	const source = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<![a-z][^>]*>/gi, " ");
	/** Éléments ouverts : nom, et vrai si son contenu est exclu (hidden, script…). */
	const stack: { name: string; skipped: boolean }[] = [];
	let buffer = "";
	const skipping = () => stack.some((entry) => entry.skipped);
	const currentBlock = () => [...stack].reverse().find((entry) => BLOCK_TAGS.has(entry.name))?.name ?? "body";
	const flush = () => {
		const text = squash(decodeEntities(buffer));
		if (text !== "") blocks.push({ tag: currentBlock(), text });
		buffer = "";
	};

	const token = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
	for (let match = token.exec(source); match !== null; match = token.exec(source)) {
		const [whole, closing, rawName, , text] = match;
		if (text !== undefined) {
			if (!skipping()) buffer += text;
			continue;
		}
		const name = rawName!.toLowerCase();
		// Deux éléments voisins (deux <span> d'une carte) ne collent pas leurs mots
		if (!INLINE_TAGS.has(name) && !BLOCK_TAGS.has(name)) buffer += " ";
		if (closing) {
			if (BLOCK_TAGS.has(name)) flush();
			const index = stack.map((entry) => entry.name).lastIndexOf(name);
			if (index !== -1) stack.length = index;
			continue;
		}
		const selfClosing = whole.endsWith("/>") || VOID_TAGS.has(name);
		const skipped = SKIPPED_TAGS.has(name) || hasAttribute(whole, "hidden");
		if (!skipping() && !skipped) {
			if (name === "meta") {
				const key = attribute(whole, "name") ?? attribute(whole, "property") ?? "";
				const content = attribute(whole, "content");
				if (SHARED_META.test(key) && content) blocks.push({ tag: "@meta", text: squash(content) });
			}
			for (const human of HUMAN_ATTRIBUTES) {
				const value = attribute(whole, human);
				if (value && squash(value) !== "") blocks.push({ tag: `@${human}`, text: squash(value) });
			}
		}
		if (BLOCK_TAGS.has(name)) flush();
		if (!selfClosing) stack.push({ name, skipped });
	}
	flush();
	return blocks;
}

/** Tout le texte visible d'une page, un bloc par ligne. */
export const visibleText = (html: string): string => visibleBlocks(html).map((block) => block.text).join("\n");
