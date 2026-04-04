import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "homes");

const ALLOWED_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/svg+xml",
]);

function assetsDir(projectId: string): string {
	return join(DATA_DIR, projectId, "assets");
}

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const dir = assetsDir(id);
		const entries = await readdir(dir);
		const assets = entries.filter(
			(e) => !e.startsWith(".") && !e.endsWith(".tmp"),
		);
		return Response.json(assets);
	} catch {
		return Response.json([]);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const formData = await request.formData();
	const file = formData.get("file") as File | null;

	if (!file) {
		return Response.json({ error: "No file provided" }, { status: 400 });
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return Response.json(
			{ error: "File type not allowed. Use PNG, JPG, WebP, or SVG." },
			{ status: 400 },
		);
	}

	const ext = file.name.split(".").pop() ?? "png";
	const assetId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
	const dir = assetsDir(id);
	await mkdir(dir, { recursive: true });

	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(join(dir, assetId), buffer);

	return Response.json({ assetId }, { status: 201 });
}
