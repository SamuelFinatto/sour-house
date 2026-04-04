import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrations } from "./registry";
import { migrateAll, migrateProject } from "./runner";
import type { Migration } from "./types";

let testDir: string;

beforeEach(async () => {
	testDir = join(tmpdir(), `sour-house-test-${randomUUID()}`);
	await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
	await rm(testDir, { recursive: true, force: true });
	// Clear any injected migrations
	migrations.length = 0;
});

async function writeJson(path: string, data: Record<string, unknown>) {
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, JSON.stringify(data));
}

async function readJson(path: string): Promise<Record<string, unknown>> {
	return JSON.parse(await readFile(path, "utf-8"));
}

describe("migrateProject", () => {
	it("stamps version on project with no migrations needed", async () => {
		const projectDir = join(testDir, "my-house");
		await mkdir(join(projectDir, "floors"), { recursive: true });

		await writeJson(join(projectDir, "project.json"), {
			id: "my-house",
			name: "My House",
			schemaVersion: "0.0.1",
		});

		const result = await migrateProject(projectDir);

		expect(result).not.toBeNull();
		expect(result!.from).toBe("0.0.1");
		expect(result!.filesUpdated).toBeGreaterThanOrEqual(1);

		const updated = await readJson(join(projectDir, "project.json"));
		expect(updated.schemaVersion).not.toBe("0.0.1");
	});

	it("returns null when already at current version", async () => {
		const { APP_VERSION } = await import("../version");
		const projectDir = join(testDir, "my-house");
		await mkdir(join(projectDir, "floors"), { recursive: true });

		await writeJson(join(projectDir, "project.json"), {
			id: "my-house",
			name: "My House",
			schemaVersion: APP_VERSION,
		});

		const result = await migrateProject(projectDir);
		expect(result).toBeNull();
	});

	it("runs migration functions on project and floor files", async () => {
		const projectDir = join(testDir, "my-house");
		await mkdir(join(projectDir, "floors"), { recursive: true });

		await writeJson(join(projectDir, "project.json"), {
			id: "my-house",
			name: "My House",
			schemaVersion: "0.0.1",
		});

		await writeJson(join(projectDir, "floors", "ground.json"), {
			id: "ground",
			name: "Ground Floor",
			schemaVersion: "0.0.1",
			entities: [],
		});

		// Add a test migration
		const testMigration: Migration = {
			from: "0.0.1",
			to: "0.1.0",
			migrateProject: (data) => ({ ...data, migrated: true }),
			migrateFloor: (data) => ({
				...data,
				floorMigrated: true,
			}),
		};
		migrations.push(testMigration);

		const result = await migrateProject(projectDir);

		expect(result).not.toBeNull();
		expect(result!.filesUpdated).toBe(2); // project + 1 floor

		const project = await readJson(join(projectDir, "project.json"));
		expect(project.migrated).toBe(true);

		const floor = await readJson(join(projectDir, "floors", "ground.json"));
		expect(floor.floorMigrated).toBe(true);
	});
});

describe("migrateAll", () => {
	it("migrates multiple projects", async () => {
		for (const id of ["house-a", "house-b"]) {
			const dir = join(testDir, id);
			await mkdir(join(dir, "floors"), { recursive: true });
			await writeJson(join(dir, "project.json"), {
				id,
				name: id,
				schemaVersion: "0.0.1",
			});
		}

		const results = await migrateAll(testDir);
		expect(results.length).toBe(2);
	});

	it("returns empty array for empty data dir", async () => {
		const results = await migrateAll(join(testDir, "nonexistent"));
		expect(results).toEqual([]);
	});
});
