import type { NextRequest } from "next/server";
import { deleteFloorSymbol, getFloorSymbol } from "@/lib/symbol-storage";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ symbolId: string }> },
) {
	const { symbolId } = await params;
	try {
		const symbol = await getFloorSymbol(symbolId);
		return Response.json(symbol);
	} catch {
		return Response.json({ error: "Symbol not found" }, { status: 404 });
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ symbolId: string }> },
) {
	const { symbolId } = await params;
	try {
		await deleteFloorSymbol(symbolId);
		return Response.json({ ok: true });
	} catch {
		return Response.json({ error: "Symbol not found" }, { status: 404 });
	}
}
