import type { NextRequest } from "next/server";
import { createFloor, createProject, getProject } from "@/lib/storage";
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

		return Response.json({ id: projectId }, { status: 201 });
	} catch {
		return Response.json(
			{ error: "Failed to import project" },
			{ status: 500 },
		);
	}
}
