import type { NextRequest } from "next/server";
import { deleteFloor, getFloor, renameFloor, updateFloor } from "@/lib/storage";

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
		if (body.newId) {
			const updated = await renameFloor(id, floorId, body.newId, body.name);
			return Response.json(updated);
		}
		const existing = await getFloor(id, floorId);
		const updated = await updateFloor(id, floorId, { ...existing, ...body });
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
