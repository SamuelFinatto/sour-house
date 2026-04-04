import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "homes");

const MIME_TYPES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	svg: "image/svg+xml",
};

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; assetId: string }> },
) {
	const { id, assetId } = await params;
	const path = join(DATA_DIR, id, "assets", assetId);
	try {
		const data = await readFile(path);
		const ext = assetId.split(".").pop()?.toLowerCase() ?? "";
		const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
		return new Response(data, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	} catch {
		return Response.json({ error: "Asset not found" }, { status: 404 });
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; assetId: string }> },
) {
	const { id, assetId } = await params;
	const path = join(DATA_DIR, id, "assets", assetId);
	try {
		await rm(path, { force: true });
		return Response.json({ ok: true });
	} catch {
		return Response.json({ error: "Asset not found" }, { status: 404 });
	}
}
