import type { NextRequest } from "next/server";
import { migrateFloorData, migrateProjectData } from "@/lib/migrations/runner";
import {
	createFloor,
	createProject,
	getProject,
	updateProject,
} from "@/lib/storage";
import type { Floor } from "@/types/floor";
import type { Project } from "@/types/project";

interface ProjectBundle {
	project: Project;
	floors: Floor[];
}

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as ProjectBundle;

		if (!body.project?.id || !body.project?.name) {
			return Response.json(
				{ error: "Invalid bundle: missing project id or name" },
				{ status: 400 },
			);
		}

		// Migrate project data if from an older version
		const migratedProject = migrateProjectData(
			body.project as unknown as Record<string, unknown>,
		) as unknown as Project;

		// Check if project already exists, generate new id if so
		let projectId = migratedProject.id;
		try {
			await getProject(projectId);
			// Project exists — append timestamp to make unique
			projectId = `${projectId}-${Date.now()}`;
		} catch {
			// Project doesn't exist, we can use the original id
		}

		const originalFloorOrder = migratedProject.floorOrder ?? [];

		await createProject({
			...migratedProject,
			id: projectId,
			floorOrder: [],
		});

		if (Array.isArray(body.floors)) {
			for (const floor of body.floors) {
				// Migrate each floor if from an older version
				const migratedFloor = migrateFloorData(
					floor as unknown as Record<string, unknown>,
				) as unknown as Floor;
				await createFloor(projectId, migratedFloor);
			}
		}

		// Restore original floor order (createFloor appends in iteration order,
		// but the original project may have had a different ordering)
		if (originalFloorOrder.length > 0) {
			await updateProject(projectId, { floorOrder: originalFloorOrder });
		}

		return Response.json({ id: projectId }, { status: 201 });
	} catch (err) {
		console.error("Import failed:", err);
		return Response.json(
			{
				error: err instanceof Error ? err.message : "Failed to import project",
			},
			{ status: 500 },
		);
	}
}
