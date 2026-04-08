import type { NextRequest } from "next/server";
import { moveFloor } from "@/lib/storage";

export async function POST(
	req: NextRequest,
	ctx: RouteContext<"/api/projects/[id]/floors/[floorId]/move">,
) {
	const { id, floorId } = await ctx.params;
	const body = await req.json();
	const { targetProjectId } = body;

	if (!targetProjectId || targetProjectId === id) {
		return Response.json({ error: "Invalid target project" }, { status: 400 });
	}

	try {
		await moveFloor(id, targetProjectId, floorId);
		return Response.json({ ok: true });
	} catch (err) {
		console.error("Failed to move floor:", err);
		return Response.json(
			{ error: err instanceof Error ? err.message : "Failed to move floor" },
			{ status: 500 },
		);
	}
}
