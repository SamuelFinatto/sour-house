import type { NextRequest } from "next/server";
import { getFloorVersion, updateFloor } from "@/lib/storage";

export async function GET(
	_req: NextRequest,
	{
		params,
	}: {
		params: Promise<{ id: string; floorId: string; version: string }>;
	},
) {
	const { id, floorId, version } = await params;
	try {
		const floor = await getFloorVersion(id, floorId, version);
		return Response.json(floor);
	} catch {
		return Response.json({ error: "Version not found" }, { status: 404 });
	}
}

export async function POST(
	_req: NextRequest,
	{
		params,
	}: {
		params: Promise<{ id: string; floorId: string; version: string }>;
	},
) {
	const { id, floorId, version } = await params;
	try {
		const floor = await getFloorVersion(id, floorId, version);
		const restored = await updateFloor(id, floorId, {
			...floor,
			id: floorId,
		});
		return Response.json(restored);
	} catch {
		return Response.json({ error: "Version not found" }, { status: 404 });
	}
}
