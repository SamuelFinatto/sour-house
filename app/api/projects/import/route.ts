import type { NextRequest } from "next/server";
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

		// Check if project already exists, generate new id if so
		let projectId = body.project.id;
		try {
			await getProject(projectId);
			// Project exists — append timestamp to make unique
			projectId = `${projectId}-${Date.now()}`;
		} catch {
			// Project doesn't exist, we can use the original id
		}

		const originalFloorOrder = body.project.floorOrder ?? [];

		await createProject({
			...body.project,
			id: projectId,
			floorOrder: [],
		});

		if (Array.isArray(body.floors)) {
			for (const floor of body.floors) {
				await createFloor(projectId, floor);
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
