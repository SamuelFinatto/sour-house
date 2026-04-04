import { deleteProject, getProject, updateProject } from "@/lib/storage";
import type { NextRequest } from "next/server";

export async function GET(
	_req: NextRequest,
	ctx: RouteContext<"/api/projects/[id]">,
) {
	const { id } = await ctx.params;
	try {
		const project = await getProject(id);
		return Response.json(project);
	} catch {
		return Response.json({ error: "Project not found" }, { status: 404 });
	}
}

export async function PUT(
	request: NextRequest,
	ctx: RouteContext<"/api/projects/[id]">,
) {
	const { id } = await ctx.params;
	const body = await request.json();

	try {
		const updated = await updateProject(id, body);
		return Response.json(updated);
	} catch {
		return Response.json({ error: "Project not found" }, { status: 404 });
	}
}

export async function DELETE(
	_req: NextRequest,
	ctx: RouteContext<"/api/projects/[id]">,
) {
	const { id } = await ctx.params;
	try {
		await deleteProject(id);
		return Response.json({ ok: true });
	} catch {
		return Response.json({ error: "Project not found" }, { status: 404 });
	}
}
