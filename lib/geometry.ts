import type { CanvasPoint, Viewport } from "@/types/editor";
import type { Entity } from "@/types/entities";

export function snapToGrid(point: CanvasPoint, gridSize: number): CanvasPoint {
	return {
		x: Math.round(point.x / gridSize) * gridSize,
		y: Math.round(point.y / gridSize) * gridSize,
	};
}

export function screenToCanvas(
	screenX: number,
	screenY: number,
	viewport: { x: number; y: number; zoom: number },
	svgRect: DOMRect,
): CanvasPoint {
	return {
		x: (screenX - svgRect.left - viewport.x) / viewport.zoom,
		y: (screenY - svgRect.top - viewport.y) / viewport.zoom,
	};
}

export function distance(a: CanvasPoint, b: CanvasPoint): number {
	return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface BBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export function getEntitiesBBox(entities: Entity[]): BBox | null {
	if (entities.length === 0) return null;

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const e of entities) {
		switch (e.type) {
			case "wall": {
				const half = e.thickness / 2;
				minX = Math.min(minX, e.x1 - half, e.x2 - half);
				minY = Math.min(minY, e.y1 - half, e.y2 - half);
				maxX = Math.max(maxX, e.x1 + half, e.x2 + half);
				maxY = Math.max(maxY, e.y1 + half, e.y2 + half);
				break;
			}
			case "room":
				for (const [px, py] of e.polygon) {
					minX = Math.min(minX, px);
					minY = Math.min(minY, py);
					maxX = Math.max(maxX, px);
					maxY = Math.max(maxY, py);
				}
				break;
			case "furniture":
			case "sink":
			case "shower":
			case "bathtub":
				minX = Math.min(minX, e.x);
				minY = Math.min(minY, e.y);
				maxX = Math.max(maxX, e.x + e.width);
				maxY = Math.max(maxY, e.y + e.height);
				break;
			case "door":
			case "window":
				minX = Math.min(minX, e.x - e.width / 2);
				minY = Math.min(minY, e.y - e.width / 2);
				maxX = Math.max(maxX, e.x + e.width / 2);
				maxY = Math.max(maxY, e.y + e.width / 2);
				break;
			case "toilet":
				minX = Math.min(minX, e.x - 20);
				minY = Math.min(minY, e.y - 25);
				maxX = Math.max(maxX, e.x + 20);
				maxY = Math.max(maxY, e.y + 25);
				break;
			default: {
				// point entities: light, outlet, annotation
				const entity = e as Entity & { x: number; y: number };
				minX = Math.min(minX, entity.x - 10);
				minY = Math.min(minY, entity.y - 10);
				maxX = Math.max(maxX, entity.x + 10);
				maxY = Math.max(maxY, entity.y + 10);
				break;
			}
		}
	}

	return { minX, minY, maxX, maxY };
}

const FIT_PADDING = 40;

export function fitViewport(
	entities: Entity[],
	containerWidth: number,
	containerHeight: number,
): Viewport {
	const bbox = getEntitiesBBox(entities);
	if (!bbox) return { x: 0, y: 0, zoom: 1 };

	const bboxW = bbox.maxX - bbox.minX;
	const bboxH = bbox.maxY - bbox.minY;

	if (bboxW === 0 && bboxH === 0) {
		return {
			x: containerWidth / 2 - bbox.minX,
			y: containerHeight / 2 - bbox.minY,
			zoom: 1,
		};
	}

	const availW = containerWidth - FIT_PADDING * 2;
	const availH = containerHeight - FIT_PADDING * 2;

	const zoom = Math.min(availW / bboxW, availH / bboxH, 2);

	const cx = (bbox.minX + bbox.maxX) / 2;
	const cy = (bbox.minY + bbox.maxY) / 2;

	return {
		x: containerWidth / 2 - cx * zoom,
		y: containerHeight / 2 - cy * zoom,
		zoom,
	};
}
