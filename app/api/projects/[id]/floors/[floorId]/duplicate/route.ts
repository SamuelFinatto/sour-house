import type { NextRequest } from "next/server";
import { duplicateFloor } from "@/lib/storage";

export async function POST(
	_req: NextRequest,
	ctx: RouteContext<"/api/projects/[id]/floors/[floorId]/duplicate">,
) {
	const { id, floorId } = await ctx.params;
	try {
		const floor = await duplicateFloor(id, floorId);
		return Response.json(floor, { status: 201 });
	} catch {
		return Response.json({ error: "Floor not found" }, { status: 404 });
	}
}
