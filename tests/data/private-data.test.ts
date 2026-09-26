import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Les données compilées (R6) ne passent jamais dans le dépôt public : elles
 * sont injectées à la construction par scripts/fetch-private-data.ts.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PRIVATE_DIRECTORIES = ["src/data/private", "tests/calculations/private"];

const git = (...args: string[]): string =>
	execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });

describe("données privées hors du dépôt public", () => {
	it("aucun fichier de src/data/private/ ni de tests/calculations/private/ n'est suivi par git", () => {
		const tracked = git("ls-files", "--", ...PRIVATE_DIRECTORIES)
			.split("\n")
			.filter(Boolean);
		expect(tracked, `fichiers privés suivis par git : ${tracked.join(", ")}`).toEqual([]);
	});

	it("les deux dossiers privés sont ignorés par git", () => {
		for (const directory of PRIVATE_DIRECTORIES) {
			expect(
				() => git("check-ignore", "--quiet", `${directory}/probe`),
				`${directory}/ n'est pas dans .gitignore`,
			).not.toThrow();
		}
	});
});
