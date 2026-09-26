#!/usr/bin/env -S npx tsx
/**
 * Injecte les données compilées (R6) depuis le dépôt privé calculateurs-ch-data,
 * avant la construction et avant les tests (`prebuild`, `pretest`).
 *
 *   test-references/**  → tests/calculations/private/**
 *   energy/**           → src/data/private/energy/**
 *   partners/**         → src/data/private/partners/**
 *   sources.private.ts  → src/data/private/sources.private.ts
 *
 * Production (CF_PAGES=1) : jeton absent ou téléchargement en échec = la
 * construction échoue. Hors production et sans jeton : les jeux d'exemple
 * fictifs de src/data/private-fixtures/ sont copiés, avec un avertissement.
 *
 * Tout est téléchargé en mémoire avant la moindre écriture. Le jeton
 * DATA_REPO_TOKEN ne figure jamais dans un fichier, un log ni un message
 * d'erreur.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const DATA_REPO = "lerasle-it-solutions/calculateurs-ch-data";
const GITHUB_API = "https://api.github.com";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRIVATE_DATA_DIR = join(ROOT, "src", "data", "private");
const PRIVATE_TESTS_DIR = join(ROOT, "tests", "calculations", "private");
const FIXTURES_DIR = join(ROOT, "src", "data", "private-fixtures");
const PRIVATE_SOURCES_FILE = "sources.private.ts";

const ENV_FILE = join(ROOT, ".env");
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const isProduction = process.env.CF_PAGES === "1";
const token = process.env.DATA_REPO_TOKEN;

const fail = (message: string): never => {
	console.error(`\n✗ [fetch-private-data] ${message}\n`);
	process.exit(1);
};

/** Destination d'un fichier du dépôt privé, ou `null` s'il n'est pas injecté. */
const destinationOf = (repoPath: string): string | null => {
	if (repoPath.split("/").pop() === ".gitkeep") return null;
	if (repoPath === PRIVATE_SOURCES_FILE) return join(PRIVATE_DATA_DIR, PRIVATE_SOURCES_FILE);
	const [folder, ...rest] = repoPath.split("/");
	if (rest.length === 0) return null;
	switch (folder) {
		case "test-references":
			return join(PRIVATE_TESTS_DIR, ...rest);
		case "energy":
			return join(PRIVATE_DATA_DIR, "energy", ...rest);
		case "partners":
			return join(PRIVATE_DATA_DIR, "partners", ...rest);
		default:
			return null;
	}
};

const repoSchema = z.object({ default_branch: z.string().min(1) });
const treeSchema = z.object({
	truncated: z.boolean(),
	tree: z.array(z.object({ path: z.string(), type: z.string(), sha: z.string() })),
});
const blobSchema = z.object({ content: z.string(), encoding: z.literal("base64") });

const github = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
	let response: Response;
	try {
		response = await fetch(`${GITHUB_API}${path}`, {
			headers: {
				authorization: `Bearer ${token}`,
				accept: "application/vnd.github+json",
				"x-github-api-version": "2022-11-28",
				"user-agent": "calculateurs.ch-fetch-private-data",
			},
		});
	} catch (cause) {
		throw new Error(`GitHub injoignable (${(cause as Error).message})`);
	}
	if (response.status === 401 || response.status === 404) {
		throw new Error(
			`GitHub répond ${response.status} sur ${path} : dépôt ${DATA_REPO} introuvable, ou jeton expiré ou sans accès en lecture à ce dépôt`,
		);
	}
	if (response.status === 409) {
		throw new Error(`le dépôt ${DATA_REPO} est vide : aucun commit à télécharger`);
	}
	if (!response.ok) {
		throw new Error(`GitHub répond ${response.status} ${response.statusText} sur ${path}`);
	}
	const parsed = schema.safeParse(await response.json());
	if (!parsed.success) {
		throw new Error(`réponse inattendue de GitHub sur ${path}`);
	}
	return parsed.data;
};

/** Télécharge tout le dépôt privé en mémoire : destination → contenu. */
const downloadPrivateFiles = async (): Promise<Map<string, Buffer>> => {
	const repo = await github(`/repos/${DATA_REPO}`, repoSchema);
	const tree = await github(
		`/repos/${DATA_REPO}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`,
		treeSchema,
	);
	if (tree.truncated) {
		throw new Error("arborescence tronquée par l'API GitHub : dépôt trop volumineux pour ce script");
	}

	const files = new Map<string, Buffer>();
	for (const entry of tree.tree) {
		if (entry.type !== "blob") continue;
		const destination = destinationOf(entry.path);
		if (destination === null) continue;
		const blob = await github(`/repos/${DATA_REPO}/git/blobs/${entry.sha}`, blobSchema);
		files.set(destination, Buffer.from(blob.content, "base64"));
	}

	if (!files.has(join(PRIVATE_DATA_DIR, PRIVATE_SOURCES_FILE))) {
		throw new Error(`${PRIVATE_SOURCES_FILE} absent de la racine du dépôt ${DATA_REPO}`);
	}
	return files;
};

const writePrivateFiles = (files: Map<string, Buffer>): void => {
	rmSync(PRIVATE_DATA_DIR, { recursive: true, force: true });
	rmSync(PRIVATE_TESTS_DIR, { recursive: true, force: true });
	for (const [destination, content] of files) {
		mkdirSync(dirname(destination), { recursive: true });
		writeFileSync(destination, content);
	}
};

const useFixtures = (): void => {
	rmSync(PRIVATE_DATA_DIR, { recursive: true, force: true });
	cpSync(FIXTURES_DIR, PRIVATE_DATA_DIR, { recursive: true });
	console.warn(
		[
			"",
			"⚠️  DONNÉES PRIVÉES ABSENTES — DATA_REPO_TOKEN n'est pas défini.",
			`   Jeux d'exemple fictifs copiés depuis ${relative(ROOT, FIXTURES_DIR)}/.`,
			"   Les suites de comparaison aux cas de référence seront ignorées.",
			"",
		].join("\n"),
	);
};

if (!token) {
	if (isProduction) {
		fail("DATA_REPO_TOKEN absent en production : la construction ne peut pas se faire sans les données privées.");
	}
	useFixtures();
} else {
	try {
		const files = await downloadPrivateFiles();
		writePrivateFiles(files);
		console.log(`✓ [fetch-private-data] ${files.size} fichier(s) injecté(s) depuis ${DATA_REPO}.`);
	} catch (error) {
		fail(`téléchargement du dépôt privé en échec — ${(error as Error).message}.`);
	}
}
