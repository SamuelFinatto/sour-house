import { SCHEMA_VERSION, createFloor } from "@/lib/storage";
import type { NextRequest } from "next/server";

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
		schemaVersion: SCHEMA_VERSION,
	});

	return Response.json(floor, { status: 201 });
}
