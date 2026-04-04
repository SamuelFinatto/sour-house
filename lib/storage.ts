import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Floor } from "@/types/floor";
import type { Project, ProjectSummary } from "@/types/project";
import { APP_VERSION } from "./version";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "homes");

function projectDir(projectId: string): string {
	return join(DATA_DIR, projectId);
}

function floorsDir(projectId: string): string {
	return join(projectDir(projectId), "floors");
}

function projectFilePath(projectId: string): string {
	return join(projectDir(projectId), "project.json");
}

function floorFilePath(projectId: string, floorId: string): string {
	return join(floorsDir(projectId), `${floorId}.json`);
}

async function ensureDir(dir: string): Promise<void> {
	await mkdir(dir, { recursive: true });
}

async function atomicWrite(path: string, data: unknown): Promise<void> {
	const tmp = `${path}.tmp`;
	await writeFile(tmp, JSON.stringify(data, null, 2));
	await rename(tmp, path);
}

// --- Projects ---

export async function listProjects(): Promise<ProjectSummary[]> {
	await ensureDir(DATA_DIR);
	const entries = await readdir(DATA_DIR, { withFileTypes: true });
	const summaries: ProjectSummary[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		try {
			const project = await getProject(entry.name);
			summaries.push({
				id: project.id,
				name: project.name,
				address: project.address,
				floorCount: project.floorOrder.length,
				updatedAt: project.updatedAt,
			});
		} catch {
			// skip invalid project dirs
		}
	}

	return summaries;
}

export async function getProject(projectId: string): Promise<Project> {
	const raw = await readFile(projectFilePath(projectId), "utf-8");
	return JSON.parse(raw) as Project;
}

export async function createProject(
	project: Omit<Project, "createdAt" | "updatedAt" | "schemaVersion">,
): Promise<Project> {
	const dir = projectDir(project.id);
	await ensureDir(dir);
	await ensureDir(join(dir, "floors"));
	await ensureDir(join(dir, "assets"));
	await ensureDir(join(dir, "exports"));

	const now = new Date().toISOString();
	const full: Project = {
		...project,
		createdAt: now,
		updatedAt: now,
		schemaVersion: APP_VERSION,
	};

	await atomicWrite(projectFilePath(project.id), full);
	return full;
}

export async function updateProject(
	projectId: string,
	updates: Partial<Omit<Project, "id" | "createdAt" | "schemaVersion">>,
): Promise<Project> {
	const existing = await getProject(projectId);
	const updated: Project = {
		...existing,
		...updates,
		updatedAt: new Date().toISOString(),
	};
	await atomicWrite(projectFilePath(projectId), updated);
	return updated;
}

export async function deleteProject(projectId: string): Promise<void> {
	await rm(projectDir(projectId), { recursive: true, force: true });
}

// --- Floors ---

export async function getFloor(
	projectId: string,
	floorId: string,
): Promise<Floor> {
	const raw = await readFile(floorFilePath(projectId, floorId), "utf-8");
	return JSON.parse(raw) as Floor;
}

export async function createFloor(
	projectId: string,
	floor: Floor,
): Promise<Floor> {
	await ensureDir(floorsDir(projectId));
	const full: Floor = { ...floor, schemaVersion: APP_VERSION };
	await atomicWrite(floorFilePath(projectId, floor.id), full);

	// Add to project floor order
	const project = await getProject(projectId);
	if (!project.floorOrder.includes(floor.id)) {
		await updateProject(projectId, {
			floorOrder: [...project.floorOrder, floor.id],
		});
	}

	return full;
}

export async function updateFloor(
	projectId: string,
	floorId: string,
	floor: Floor,
): Promise<Floor> {
	await atomicWrite(floorFilePath(projectId, floorId), floor);
	await updateProject(projectId, {}); // touch updatedAt
	return floor;
}

export async function deleteFloor(
	projectId: string,
	floorId: string,
): Promise<void> {
	await rm(floorFilePath(projectId, floorId), { force: true });

	const project = await getProject(projectId);
	await updateProject(projectId, {
		floorOrder: project.floorOrder.filter((id) => id !== floorId),
	});
}
