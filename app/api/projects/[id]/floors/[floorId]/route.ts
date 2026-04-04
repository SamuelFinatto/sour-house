import { deleteFloor, getFloor, updateFloor } from "@/lib/storage";
import type { NextRequest } from "next/server";

export async function GET(
	_req: NextRequest,
	ctx: RouteContext<"/api/projects/[id]/floors/[floorId]">,
) {
	const { id, floorId } = await ctx.params;
	try {
		const floor = await getFloor(id, floorId);
		return Response.json(floor);
	} catch {
		return Response.json({ error: "Floor not found" }, { status: 404 });
	}
}

export async function PUT(
	request: NextRequest,
	ctx: RouteContext<"/api/projects/[id]/floors/[floorId]">,
) {
	const { id, floorId } = await ctx.params;
	const body = await request.json();

	try {
		const updated = await updateFloor(id, floorId, body);
		return Response.json(updated);
	} catch {
		return Response.json({ error: "Floor not found" }, { status: 404 });
	}
}

export async function DELETE(
	_req: NextRequest,
	ctx: RouteContext<"/api/projects/[id]/floors/[floorId]">,
) {
	const { id, floorId } = await ctx.params;
	try {
		await deleteFloor(id, floorId);
		return Response.json({ ok: true });
	} catch {
		return Response.json({ error: "Floor not found" }, { status: 404 });
	}
}
