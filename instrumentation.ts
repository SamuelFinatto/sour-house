export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { join } = await import("node:path");
		const { migrateAll } = await import("@/lib/migrations");

		const dataDir = process.env.DATA_DIR || join(process.cwd(), "homes");

		try {
			const results = await migrateAll(dataDir);
			if (results.length > 0) {
				for (const r of results) {
					console.log(
						`[migration] ${r.projectId}: ${r.from} → ${r.to} (${r.filesUpdated} files)`,
					);
				}
			}
		} catch (err) {
			console.error("[migration] Auto-migration failed:", err);
		}
	}
}
