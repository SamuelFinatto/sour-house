import { getFloor, getProject } from "@/lib/storage";
import type { Floor } from "@/types/floor";

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ id: string }> },
) {
	const { id } = await ctx.params;
	try {
		const project = await getProject(id);
		const floors: Floor[] = [];
		for (const floorId of project.floorOrder) {
			try {
				floors.push(await getFloor(id, floorId));
			} catch {
				// skip missing floors
			}
		}

		const bundle = { project, floors };

		return new Response(JSON.stringify(bundle, null, 2), {
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename="${project.name}.json"`,
			},
		});
	} catch {
		return Response.json({ error: "Project not found" }, { status: 404 });
	}
}
