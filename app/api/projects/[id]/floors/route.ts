import type { NextRequest } from "next/server";
import { createFloor, listFloors } from "@/lib/storage";
import { APP_VERSION } from "@/lib/version";

export async function GET(
	_req: NextRequest,
	ctx: RouteContext<"/api/projects/[id]/floors">,
) {
	const { id } = await ctx.params;
	try {
		const floors = await listFloors(id);
		return Response.json(floors);
	} catch {
		return Response.json({ error: "Project not found" }, { status: 404 });
	}
}

export async function POST(
	request: NextRequest,
	ctx: RouteContext<"/api/projects/[id]/floors">,
) {
	const { id } = await ctx.params;
	const body = await request.json();

	if (!body.id || !body.name) {
		return Response.json(
			{ error: "id and name are required" },
			{ status: 400 },
		);
	}

	const floor = await createFloor(id, {
		id: body.id,
		name: body.name,
		elevationCm: body.elevationCm || 0,
		units: body.units || "cm",
		grid: body.grid || { enabled: true, size: 10, snapToGrid: true },
		layers: body.layers || {
			structure: true,
			furniture: true,
			electrical: true,
			plumbing: true,
			notes: true,
		},
		entities: body.entities || [],
		schemaVersion: APP_VERSION,
	});

	return Response.json(floor, { status: 201 });
}
