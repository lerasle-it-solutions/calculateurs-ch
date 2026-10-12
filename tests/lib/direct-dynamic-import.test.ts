import { describe, expect, it } from "vitest";

import { type BundleChunk, directImportProblems } from "../../src/lib/build/direct-dynamic-import";

/**
 * Garde-fous du chargement direct des import() : la construction échoue si le
 * helper de Vite n'a pas été remplacé, ou si un module chargé à la demande
 * dépend d'une feuille de style.
 */
const chunk = (overrides: Partial<BundleChunk> = {}): BundleChunk => ({
	code: "",
	imports: [],
	dynamicImports: [],
	importedCss: [],
	...overrides,
});

const pageWithEstimator = (estimator: Partial<BundleChunk> = {}, shared: Partial<BundleChunk> = {}) => ({
	"page.js": chunk({ imports: ["shared.js"], dynamicImports: ["estimator.js"] }),
	"estimator.js": chunk({ imports: ["shared.js"], ...estimator }),
	"shared.js": chunk(shared),
});

describe("chargement direct des import()", () => {
	it("aucun problème quand le helper est remplacé et que le module à la demande n'a pas de feuille de style", () => {
		expect(directImportProblems(pageWithEstimator(), true)).toEqual([]);
	});

	it("aucun import() : rien à remplacer, rien à signaler", () => {
		expect(directImportProblems({ "page.js": chunk() }, false)).toEqual([]);
	});

	it("helper non trouvé alors que la page contient un import()", () => {
		const problems = directImportProblems(pageWithEstimator(), false);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(/n'a pas été trouvé.*page\.js/);
	});

	it("helper d'origine encore présent dans un morceau", () => {
		const problems = directImportProblems(pageWithEstimator({}, { code: "dispatchEvent(new Event(`vite:preloadError`))" }), true);
		expect(problems).toEqual(["shared.js contient encore le helper de préchargement d'origine de Vite."]);
	});

	it("feuille de style du module à la demande, ou d'une de ses dépendances", () => {
		expect(directImportProblems(pageWithEstimator({ importedCss: ["estimator.css"] }), true)[0]).toMatch(
			/page\.js charge estimator\.js à la demande, qui dépend de la feuille de style estimator\.css/,
		);
		expect(directImportProblems(pageWithEstimator({}, { importedCss: ["shared.css"] }), true)[0]).toMatch(/shared\.css \(via shared\.js\)/);
	});
});
