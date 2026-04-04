import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { coerce, gt, lt, valid } from "semver";
import { APP_VERSION } from "../version";
import { migrations } from "./registry";
import type { Migration } from "./types";

function getSortedMigrations(): Migration[] {
	return [...migrations].sort((a, b) => {
		const va = coerce(a.from);
		const vb = coerce(b.from);
		if (!va || !vb) return 0;
		return lt(va, vb) ? -1 : gt(va, vb) ? 1 : 0;
	});
}

function getMigrationsForVersion(fromVersion: string): Migration[] {
	const from = coerce(fromVersion);
	if (!from) return [];

	const sorted = getSortedMigrations();
	return sorted.filter((m) => {
		const mFrom = coerce(m.from);
		return mFrom && !lt(mFrom, from) && lt(mFrom, coerce(APP_VERSION)!);
	});
}

async function atomicWrite(
	path: string,
	data: Record<string, unknown>,
): Promise<void> {
	const tmp = `${path}.tmp`;
	await writeFile(tmp, JSON.stringify(data, null, 2));
	await rename(tmp, path);
}

async function readJson(path: string): Promise<Record<string, unknown>> {
	const raw = await readFile(path, "utf-8");
	return JSON.parse(raw);
}

export interface MigrationResult {
	projectId: string;
	from: string;
	to: string;
	filesUpdated: number;
}

export async function migrateProject(
	projectDir: string,
): Promise<MigrationResult | null> {
	const projectPath = join(projectDir, "project.json");
	let projectData = await readJson(projectPath);

	const currentVersion = valid(
		coerce(String(projectData.schemaVersion ?? "0.0.0")),
	);
	if (!currentVersion) return null;
	if (currentVersion === APP_VERSION) return null;

	const applicable = getMigrationsForVersion(currentVersion);
	if (applicable.length === 0 && currentVersion !== APP_VERSION) {
		// No migrations needed but version differs — just stamp it
		projectData.schemaVersion = APP_VERSION;
		await atomicWrite(projectPath, projectData);
		return {
			projectId: String(projectData.id),
			from: currentVersion,
			to: APP_VERSION,
			filesUpdated: 1,
		};
	}

	let filesUpdated = 0;

	// Migrate project.json
	for (const migration of applicable) {
		if (migration.migrateProject) {
			projectData = migration.migrateProject(projectData);
		}
	}
	projectData.schemaVersion = APP_VERSION;
	await atomicWrite(projectPath, projectData);
	filesUpdated++;

	// Migrate floor files
	const floorsDir = join(projectDir, "floors");
	let floorFiles: string[] = [];
	try {
		const entries = await readdir(floorsDir);
		floorFiles = entries.filter((f) => f.endsWith(".json"));
	} catch {
		// no floors dir
	}

	for (const file of floorFiles) {
		const floorPath = join(floorsDir, file);
		let floorData = await readJson(floorPath);

		for (const migration of applicable) {
			if (migration.migrateFloor) {
				floorData = migration.migrateFloor(floorData);
			}
		}
		floorData.schemaVersion = APP_VERSION;
		await atomicWrite(floorPath, floorData);
		filesUpdated++;
	}

	return {
		projectId: String(projectData.id),
		from: currentVersion,
		to: APP_VERSION,
		filesUpdated,
	};
}

export async function migrateAll(
	dataDir: string,
): Promise<MigrationResult[]> {
	const results: MigrationResult[] = [];

	let entries: string[];
	try {
		const dirents = await readdir(dataDir, { withFileTypes: true });
		entries = dirents
			.filter((d) => d.isDirectory())
			.map((d) => d.name as unknown as string);
	} catch {
		return results;
	}

	for (const name of entries) {
		try {
			const result = await migrateProject(join(dataDir, name));
			if (result) results.push(result);
		} catch (err) {
			console.error(`Failed to migrate project ${name}:`, err);
		}
	}

	return results;
}
