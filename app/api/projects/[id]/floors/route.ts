import type { NextRequest } from "next/server";
import { migrateFloorData } from "@/lib/migrations/runner";
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

	// Migrate imported floor data if from an older version
	const migrated = migrateFloorData(body as Record<string, unknown>);

	const floor = await createFloor(id, {
		id: migrated.id as string,
		name: migrated.name as string,
		elevationCm: (migrated.elevationCm as number) || 0,
		units: (migrated.units as string) || "cm",
		grid: (migrated.grid as typeof body.grid) || {
			enabled: true,
			size: 10,
			snapToGrid: true,
		},
		layers: (migrated.layers as typeof body.layers) || {
			structure: true,
			furniture: true,
			electrical: true,
			plumbing: true,
			notes: true,
		},
		entities: (migrated.entities as typeof body.entities) || [],
		schemaVersion: APP_VERSION,
	});

	return Response.json(floor, { status: 201 });
}
