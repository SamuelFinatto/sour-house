import { createProject, listProjects } from "@/lib/storage";

export async function GET() {
	const projects = await listProjects();
	return Response.json(projects);
}

export async function POST(request: Request) {
	const body = await request.json();

	if (!body.id || !body.name) {
		return Response.json(
			{ error: "id and name are required" },
			{ status: 400 },
		);
	}

	const project = await createProject({
		id: body.id,
		name: body.name,
		address: body.address,
		units: body.units || "cm",
		defaultWallThickness: body.defaultWallThickness || 20,
		floorOrder: [],
	});

	return Response.json(project, { status: 201 });
}
