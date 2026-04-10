import { join } from "node:path";
import type { NextRequest } from "next/server";
import { migrateAll } from "@/lib/migrations";
import { migrateFloorData } from "@/lib/migrations/runner";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "homes");

export async function POST() {
	try {
		const results = await migrateAll(DATA_DIR);
		if (results.length === 0) {
			return Response.json({ message: "All projects are up to date" });
		}
		return Response.json({ migrated: results });
	} catch (err) {
		return Response.json(
			{ error: `Migration failed: ${err}` },
			{ status: 500 },
		);
	}
}

/** Migrate a single floor JSON object in-memory and return it */
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const migrated = migrateFloorData(body as Record<string, unknown>);
		return Response.json(migrated);
	} catch (err) {
		return Response.json(
			{ error: `Migration failed: ${err}` },
			{ status: 500 },
		);
	}
}
