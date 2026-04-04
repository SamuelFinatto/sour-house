import type { NextRequest } from "next/server";
import { listFloorVersions } from "@/lib/storage";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; floorId: string }> },
) {
	const { id, floorId } = await params;
	const versions = await listFloorVersions(id, floorId);
	return Response.json(versions);
}
