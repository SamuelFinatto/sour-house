import { join } from "node:path";
import { migrateAll } from "@/lib/migrations";

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
