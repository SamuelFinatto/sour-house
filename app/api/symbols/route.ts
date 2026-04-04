import type { NextRequest } from "next/server";
import { createFloorSymbol, listFloorSymbols } from "@/lib/symbol-storage";
import type { Entity } from "@/types/entities";
import type { FloorSymbol } from "@/types/symbol";

function computeBoundingBox(entities: Entity[]) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const e of entities) {
		if (e.type === "wall") {
			minX = Math.min(minX, e.x1, e.x2);
			minY = Math.min(minY, e.y1, e.y2);
			maxX = Math.max(maxX, e.x1, e.x2);
			maxY = Math.max(maxY, e.y1, e.y2);
		} else if (e.type === "room") {
			for (const [px, py] of e.polygon) {
				minX = Math.min(minX, px);
				minY = Math.min(minY, py);
				maxX = Math.max(maxX, px);
				maxY = Math.max(maxY, py);
			}
		} else if ("x" in e && "y" in e) {
			const ex = (e as Entity & { x: number }).x;
			const ey = (e as Entity & { y: number }).y;
			const ew = "width" in e ? (e as Entity & { width: number }).width : 10;
			const eh = "height" in e ? (e as Entity & { height: number }).height : 10;
			minX = Math.min(minX, ex);
			minY = Math.min(minY, ey);
			maxX = Math.max(maxX, ex + ew);
			maxY = Math.max(maxY, ey + eh);
		}
	}

	return {
		x: Number.isFinite(minX) ? minX : 0,
		y: Number.isFinite(minY) ? minY : 0,
		width: Number.isFinite(maxX - minX) ? maxX - minX : 100,
		height: Number.isFinite(maxY - minY) ? maxY - minY : 100,
	};
}

export async function GET() {
	const symbols = await listFloorSymbols();
	return Response.json(symbols);
}

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { name, entities } = body as {
		name: string;
		entities: Entity[];
	};

	if (!name || !entities?.length) {
		return Response.json(
			{ error: "Name and entities are required" },
			{ status: 400 },
		);
	}

	const bb = computeBoundingBox(entities);

	// Normalize entities relative to (0,0)
	const normalized = entities.map((e) => {
		if (e.type === "wall") {
			return {
				...e,
				x1: e.x1 - bb.x,
				y1: e.y1 - bb.y,
				x2: e.x2 - bb.x,
				y2: e.y2 - bb.y,
			};
		}
		if (e.type === "room") {
			return {
				...e,
				polygon: e.polygon.map(
					([px, py]) => [px - bb.x, py - bb.y] as [number, number],
				),
			};
		}
		if ("x" in e && "y" in e) {
			return {
				...e,
				x: (e as Entity & { x: number }).x - bb.x,
				y: (e as Entity & { y: number }).y - bb.y,
			};
		}
		return e;
	});

	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const symbol: FloorSymbol = {
		id,
		name,
		entities: normalized as Entity[],
		boundingBox: { x: 0, y: 0, width: bb.width, height: bb.height },
		createdAt: new Date().toISOString(),
	};

	await createFloorSymbol(symbol);
	return Response.json(symbol, { status: 201 });
}
