import type { CanvasPoint } from "@/types/editor";

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
