"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	distance,
	generateId,
	polygonArea,
	screenToCanvas,
	snapToGrid,
} from "@/lib/geometry";
import { formatArea, formatLength } from "@/lib/units";
import type { Tool, Viewport } from "@/types/editor";
import type { Entity, WallEntity } from "@/types/entities";
import type { FloorUnderlay, LayerVisibility } from "@/types/floor";

interface CanvasProps {
	entities: Entity[];
	viewport: Viewport;
	activeTool: Tool;
	visibleLayers: LayerVisibility;
	gridEnabled: boolean;
	snapEnabled: boolean;
	gridSize: number;
	selectedEntityIds: string[];
	units: string;
	underlay?: FloorUnderlay;
	underlayUrl?: string;
	onViewportChange: (viewport: Viewport) => void;
	onAddEntity: (entity: Entity) => void;
	onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
	onSelectEntity: (id: string | null) => void;
}

const CANVAS_SIZE = 2000;
const WALL_SNAP_DISTANCE = 20;

// ponytail: nearest-endpoint snap only, no shared-vertex graph — if a wall
// moves later the joined corner doesn't follow; upgrade to a vertex-node
// model if walls need to stay connected after the fact.
function findWallSnapPoint(
	entities: Entity[],
	pt: { x: number; y: number },
	excludeWallId?: string,
): { x: number; y: number } | null {
	let best: { x: number; y: number } | null = null;
	let bestDist = WALL_SNAP_DISTANCE;
	for (const e of entities) {
		if (e.type !== "wall" || e.id === excludeWallId) continue;
		for (const [ex, ey] of [
			[e.x1, e.y1],
			[e.x2, e.y2],
		] as [number, number][]) {
			const d = Math.hypot(ex - pt.x, ey - pt.y);
			if (d < bestDist) {
				bestDist = d;
				best = { x: ex, y: ey };
			}
		}
	}
	return best;
}

/** The 4 corners of a wall's thickness rectangle, as an SVG points string. */
function wallPolygonPoints(wall: WallEntity): string {
	const dx = wall.x2 - wall.x1;
	const dy = wall.y2 - wall.y1;
	const len = Math.hypot(dx, dy) || 1;
	const nx = (-dy / len) * (wall.thickness / 2);
	const ny = (dx / len) * (wall.thickness / 2);
	return [
		[wall.x1 + nx, wall.y1 + ny],
		[wall.x2 + nx, wall.y2 + ny],
		[wall.x2 - nx, wall.y2 - ny],
		[wall.x1 - nx, wall.y1 - ny],
	]
		.map(([x, y]) => `${x},${y}`)
		.join(" ");
}

interface WallChain {
	points: { x: number; y: number }[];
	closed: boolean;
	thickness: number;
}

const WALL_JOIN_EPS = 0.5;

function samePoint(
	a: { x: number; y: number },
	b: { x: number; y: number },
): boolean {
	return Math.hypot(a.x - b.x, a.y - b.y) < WALL_JOIN_EPS;
}

// Groups walls that meet end-to-end (same coordinates, same thickness) into
// continuous chains so the whole chain can be drawn as one stroked SVG path.
// A single path lets the browser compute correct miter joins at every
// interior corner for free — no manual corner-trim geometry needed. Chains
// only extend through points where exactly one other wall of matching
// thickness continues; T-junctions and thickness changes end a chain there
// (that end falls back to a plain square cap, same overlap-fill as before).
function buildWallChains(walls: WallEntity[]): WallChain[] {
	function otherEnd(wall: WallEntity, point: { x: number; y: number }) {
		return samePoint({ x: wall.x1, y: wall.y1 }, point)
			? { x: wall.x2, y: wall.y2 }
			: { x: wall.x1, y: wall.y1 };
	}

	const visited = new Set<string>();
	const chains: WallChain[] = [];

	function findNext(
		point: { x: number; y: number },
		thickness: number,
	): WallEntity | null {
		const candidates = walls.filter(
			(w) =>
				!visited.has(w.id) &&
				w.thickness === thickness &&
				(samePoint({ x: w.x1, y: w.y1 }, point) ||
					samePoint({ x: w.x2, y: w.y2 }, point)),
		);
		return candidates.length === 1 ? candidates[0] : null;
	}

	for (const wall of walls) {
		if (visited.has(wall.id)) continue;
		visited.add(wall.id);
		const points = [
			{ x: wall.x1, y: wall.y1 },
			{ x: wall.x2, y: wall.y2 },
		];

		let tail = points[points.length - 1];
		for (;;) {
			const next = findNext(tail, wall.thickness);
			if (!next) break;
			visited.add(next.id);
			tail = otherEnd(next, tail);
			points.push(tail);
		}

		let head = points[0];
		for (;;) {
			const prev = findNext(head, wall.thickness);
			if (!prev) break;
			visited.add(prev.id);
			head = otherEnd(prev, head);
			points.unshift(head);
		}

		const closed =
			points.length > 2 && samePoint(points[0], points[points.length - 1]);
		chains.push({
			points: closed ? points.slice(0, -1) : points,
			closed,
			thickness: wall.thickness,
		});
	}

	return chains;
}

function WallChainShape({ chain }: { chain: WallChain }) {
	const d =
		chain.points
			.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
			.join(" ") + (chain.closed ? " Z" : "");
	return (
		<g style={{ pointerEvents: "none" }}>
			<path
				d={d}
				fill="none"
				stroke="#1a1a1a"
				strokeWidth={chain.thickness}
				strokeLinejoin="miter"
				strokeLinecap="square"
			/>
			<path
				d={d}
				fill="none"
				stroke="white"
				strokeWidth={Math.max(chain.thickness - 3, 1)}
				strokeLinejoin="miter"
				strokeLinecap="square"
			/>
		</g>
	);
}

export function Canvas({
	entities,
	viewport,
	activeTool,
	visibleLayers,
	gridEnabled,
	snapEnabled,
	gridSize,
	selectedEntityIds,
	units,
	underlay,
	underlayUrl,
	onViewportChange,
	onAddEntity,
	onUpdateEntity,
	onSelectEntity,
}: CanvasProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [drawCurrent, setDrawCurrent] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [isPanning, setIsPanning] = useState(false);
	// "click" = click-move-click mode, "drag" = mousedown-drag-mouseup mode
	const [drawMode, setDrawMode] = useState<"click" | "drag" | null>(null);
	const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
	});
	const mouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const entityClickedRef = useRef(false);
	// Entity dragging state
	const [dragEntity, setDragEntity] = useState<{
		id: string;
		startX: number;
		startY: number;
		originX: number;
		originY: number;
	} | null>(null);
	// Room vertex dragging state
	// Room vertex dragging state
	const [vertexDrag, setVertexDrag] = useState<{
		entityId: string;
		vertexIndex: number;
		startX: number;
		startY: number;
	} | null>(null);
	// Resize handle dragging state
	const [resizeDrag, setResizeDrag] = useState<{
		entityId: string;
		handle: "tl" | "tr" | "bl" | "br";
		startX: number;
		startY: number;
		origX: number;
		origY: number;
		origW: number;
		origH: number;
	} | null>(null);
	// Rotate handle dragging state
	const [rotateDrag, setRotateDrag] = useState<{
		entityId: string;
		centerX: number;
		centerY: number;
	} | null>(null);
	// Measure tool: persisted measurement after completing a measurement
	const [measurement, setMeasurement] = useState<{
		start: { x: number; y: number };
		end: { x: number; y: number };
	} | null>(null);

	const DRAG_THRESHOLD = 5;

	// Reset draw state when tool changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: activeTool is intentionally a trigger
	useEffect(() => {
		setDrawStart(null);
		setDrawCurrent(null);
		setDrawMode(null);
		setDragEntity(null);
		setVertexDrag(null);
		setResizeDrag(null);
		setRotateDrag(null);
		setMeasurement(null);
	}, [activeTool]);

	const getCanvasPoint = useCallback(
		(e: React.MouseEvent) => {
			if (!svgRef.current) return { x: 0, y: 0 };
			const rect = svgRef.current.getBoundingClientRect();
			const pt = screenToCanvas(e.clientX, e.clientY, viewport, rect);
			return snapEnabled ? snapToGrid(pt, gridSize) : pt;
		},
		[viewport, snapEnabled, gridSize],
	);

	const isDrawTool =
		activeTool === "wall" ||
		activeTool === "room" ||
		activeTool === "door" ||
		activeTool === "window" ||
		activeTool === "measure";
	const isPlaceTool =
		activeTool === "light" ||
		activeTool === "outlet" ||
		activeTool === "annotation" ||
		activeTool === "furniture" ||
		activeTool === "sink" ||
		activeTool === "toilet" ||
		activeTool === "shower" ||
		activeTool === "bathtub" ||
		activeTool === "stairs";

	function finishDraw(
		start: { x: number; y: number },
		end: { x: number; y: number },
	) {
		if (activeTool === "measure") {
			if (start.x === end.x && start.y === end.y) return;
			setMeasurement({ start, end });
			setDrawStart(null);
			setDrawCurrent(null);
			setDrawMode(null);
			return;
		}
		if (activeTool === "wall") {
			if (start.x === end.x && start.y === end.y) return;
			const snappedStart = findWallSnapPoint(entities, start) ?? start;
			const snappedEnd = findWallSnapPoint(entities, end) ?? end;
			onAddEntity({
				id: generateId(),
				type: "wall",
				layer: "structure",
				x1: snappedStart.x,
				y1: snappedStart.y,
				x2: snappedEnd.x,
				y2: snappedEnd.y,
				thickness: 20,
			});
		} else if (activeTool === "door" || activeTool === "window") {
			if (start.x === end.x && start.y === end.y) return;
			const dx = end.x - start.x;
			const dy = end.y - start.y;
			const width = Math.sqrt(dx * dx + dy * dy);
			const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
			const cx = (start.x + end.x) / 2;
			const cy = (start.y + end.y) / 2;
			if (activeTool === "door") {
				onAddEntity({
					id: generateId(),
					type: "door",
					layer: "structure",
					x: cx,
					y: cy,
					width,
					rotation,
					wallId: "",
					swing: "left",
				});
			} else {
				onAddEntity({
					id: generateId(),
					type: "window",
					layer: "structure",
					x: cx,
					y: cy,
					width,
					rotation,
					wallId: "",
				});
			}
		} else if (activeTool === "room") {
			const x = Math.min(start.x, end.x);
			const y = Math.min(start.y, end.y);
			const w = Math.abs(end.x - start.x);
			const h = Math.abs(end.y - start.y);
			if (w > 0 && h > 0) {
				onAddEntity({
					id: generateId(),
					type: "room",
					layer: "structure",
					name: "Room",
					polygon: [
						[x, y],
						[x + w, y],
						[x + w, y + h],
						[x, y + h],
					],
				});
			}
		}
		setDrawStart(null);
		setDrawCurrent(null);
		setDrawMode(null);
	}

	function placeEntity(pt: { x: number; y: number }) {
		if (activeTool === "furniture") {
			onAddEntity({
				id: generateId(),
				type: "furniture",
				layer: "furniture",
				x: pt.x,
				y: pt.y,
				width: 80,
				height: 60,
				rotation: 0,
				name: "Item",
				furnitureType: "generic",
			});
		} else if (activeTool === "annotation") {
			onAddEntity({
				id: generateId(),
				type: "annotation",
				layer: "notes",
				x: pt.x,
				y: pt.y,
				text: "Note",
			});
		} else if (activeTool === "sink") {
			onAddEntity({
				id: generateId(),
				type: "sink",
				layer: "plumbing",
				x: pt.x,
				y: pt.y,
				width: 50,
				height: 40,
				rotation: 0,
			});
		} else if (activeTool === "toilet") {
			onAddEntity({
				id: generateId(),
				type: "toilet",
				layer: "plumbing",
				x: pt.x,
				y: pt.y,
				rotation: 0,
			});
		} else if (activeTool === "shower") {
			onAddEntity({
				id: generateId(),
				type: "shower",
				layer: "plumbing",
				x: pt.x,
				y: pt.y,
				width: 90,
				height: 90,
				rotation: 0,
			});
		} else if (activeTool === "bathtub") {
			onAddEntity({
				id: generateId(),
				type: "bathtub",
				layer: "plumbing",
				x: pt.x,
				y: pt.y,
				width: 150,
				height: 70,
				rotation: 0,
			});
		} else if (activeTool === "stairs") {
			onAddEntity({
				id: generateId(),
				type: "stairs",
				layer: "structure",
				x: pt.x,
				y: pt.y,
				width: 100,
				height: 200,
				rotation: 0,
				direction: "up",
			});
		} else {
			onAddEntity({
				id: generateId(),
				type: activeTool,
				layer: "electrical",
				x: pt.x,
				y: pt.y,
			} as Entity);
		}
	}

	function handleMouseDown(e: React.MouseEvent) {
		if (e.button === 1) {
			e.preventDefault();
			setIsPanning(true);
			panStartRef.current = {
				x: e.clientX,
				y: e.clientY,
				vx: viewport.x,
				vy: viewport.y,
			};
			return;
		}

		if (activeTool === "pan") {
			setIsPanning(true);
			panStartRef.current = {
				x: e.clientX,
				y: e.clientY,
				vx: viewport.x,
				vy: viewport.y,
			};
			return;
		}

		if (activeTool === "select") {
			return;
		}

		mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

		// If already in click-move-click mode, second click finishes
		if (drawMode === "click" && drawStart) {
			const pt = getCanvasPoint(e);
			if (isDrawTool) {
				finishDraw(drawStart, pt);
			}
			return;
		}

		// Place tools place immediately on click
		if (isPlaceTool) {
			const pt = getCanvasPoint(e);
			setDrawStart(pt);
			setDrawCurrent(pt);
			return;
		}

		// Start a potential draw
		if (isDrawTool) {
			const pt = getCanvasPoint(e);
			setDrawStart(pt);
			setDrawCurrent(pt);
			setDrawMode(null); // will be determined on move or up
		}
	}

	function handleMouseMove(e: React.MouseEvent) {
		if (isPanning) {
			const dx = e.clientX - panStartRef.current.x;
			const dy = e.clientY - panStartRef.current.y;
			onViewportChange({
				...viewport,
				x: panStartRef.current.vx + dx,
				y: panStartRef.current.vy + dy,
			});
			return;
		}

		// Room vertex / wall endpoint dragging
		if (vertexDrag) {
			const pt = getCanvasPoint(e);
			const entity = entities.find((ent) => ent.id === vertexDrag.entityId);
			if (entity?.type === "room") {
				const newPolygon = entity.polygon.map((p, i) =>
					i === vertexDrag.vertexIndex ? ([pt.x, pt.y] as [number, number]) : p,
				);
				onUpdateEntity(entity.id, { polygon: newPolygon } as Partial<Entity>);
			} else if (entity?.type === "wall") {
				const snapped = findWallSnapPoint(entities, pt, entity.id) ?? pt;
				if (vertexDrag.vertexIndex === 0) {
					onUpdateEntity(entity.id, {
						x1: snapped.x,
						y1: snapped.y,
					} as Partial<Entity>);
				} else {
					onUpdateEntity(entity.id, {
						x2: snapped.x,
						y2: snapped.y,
					} as Partial<Entity>);
				}
			}
			return;
		}

		// Resize handle dragging
		if (resizeDrag) {
			const pt = getCanvasPoint(e);
			const entity = entities.find((ent) => ent.id === resizeDrag.entityId);
			if (!entity) return;

			// Door/window: resize width by moving endpoint
			if (entity.type === "door" || entity.type === "window") {
				const dx = pt.x - entity.x;
				const dy = pt.y - entity.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const newWidth = Math.max(20, dist * 2);
				const newRotation = (Math.atan2(dy, dx) * 180) / Math.PI;
				onUpdateEntity(entity.id, {
					width: newWidth,
					rotation: Math.round(newRotation),
				} as Partial<Entity>);
				return;
			}

			// Box entities: resize by corner
			const dx = pt.x - resizeDrag.startX;
			const dy = pt.y - resizeDrag.startY;
			const h = resizeDrag.handle;
			let newX = resizeDrag.origX;
			let newY = resizeDrag.origY;
			let newW = resizeDrag.origW;
			let newH = resizeDrag.origH;

			if (h === "tl") {
				newX = resizeDrag.origX + dx;
				newY = resizeDrag.origY + dy;
				newW = Math.max(20, resizeDrag.origW - dx);
				newH = Math.max(20, resizeDrag.origH - dy);
			} else if (h === "tr") {
				newY = resizeDrag.origY + dy;
				newW = Math.max(20, resizeDrag.origW + dx);
				newH = Math.max(20, resizeDrag.origH - dy);
			} else if (h === "bl") {
				newX = resizeDrag.origX + dx;
				newW = Math.max(20, resizeDrag.origW - dx);
				newH = Math.max(20, resizeDrag.origH + dy);
			} else {
				newW = Math.max(20, resizeDrag.origW + dx);
				newH = Math.max(20, resizeDrag.origH + dy);
			}

			onUpdateEntity(resizeDrag.entityId, {
				x: newX,
				y: newY,
				width: newW,
				height: newH,
			} as Partial<Entity>);
			return;
		}

		// Rotate handle dragging
		if (rotateDrag) {
			const pt = getCanvasPoint(e);
			const angle =
				(Math.atan2(pt.y - rotateDrag.centerY, pt.x - rotateDrag.centerX) *
					180) /
					Math.PI +
				90;
			onUpdateEntity(rotateDrag.entityId, {
				rotation: Math.round(angle),
			} as Partial<Entity>);
			return;
		}

		// Entity dragging
		if (dragEntity) {
			const pt = getCanvasPoint(e);
			const dx = pt.x - dragEntity.startX;
			const dy = pt.y - dragEntity.startY;
			const entity = entities.find((ent) => ent.id === dragEntity.id);
			if (!entity) return;

			if (entity.type === "wall") {
				onUpdateEntity(entity.id, {
					x1: dragEntity.originX + dx,
					y1: dragEntity.originY + dy,
					x2: entity.x2 - entity.x1 + dragEntity.originX + dx,
					y2: entity.y2 - entity.y1 + dragEntity.originY + dy,
				} as Partial<Entity>);
			} else if (entity.type === "room") {
				const polyDx = dx;
				const polyDy = dy;
				const firstPt = entity.polygon[0];
				const offsetX = dragEntity.originX + polyDx - firstPt[0];
				const offsetY = dragEntity.originY + polyDy - firstPt[1];
				onUpdateEntity(entity.id, {
					polygon: entity.polygon.map(([px, py]) => [
						px + offsetX,
						py + offsetY,
					]),
				} as Partial<Entity>);
			} else if ("x" in entity && "y" in entity) {
				onUpdateEntity(entity.id, {
					x: dragEntity.originX + dx,
					y: dragEntity.originY + dy,
				} as Partial<Entity>);
			}
			return;
		}

		if (drawStart) {
			const pt = getCanvasPoint(e);
			setDrawCurrent(pt);

			// Determine drag mode if not yet set
			if (drawMode === null) {
				const dx = e.clientX - mouseDownPosRef.current.x;
				const dy = e.clientY - mouseDownPosRef.current.y;
				if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
					setDrawMode("drag");
				}
			}
		}
	}

	function handleMouseUp(e: React.MouseEvent) {
		if (isPanning) {
			setIsPanning(false);
			return;
		}

		// Finish vertex drag
		if (vertexDrag) {
			setVertexDrag(null);
			return;
		}

		// Finish resize drag
		if (resizeDrag) {
			setResizeDrag(null);
			return;
		}

		// Finish rotate drag
		if (rotateDrag) {
			setRotateDrag(null);
			return;
		}

		// Finish entity drag
		if (dragEntity) {
			setDragEntity(null);
			return;
		}

		if (!drawStart) return;

		const pt = getCanvasPoint(e);

		// Place tools always place on click
		if (isPlaceTool) {
			placeEntity(pt);
			setDrawStart(null);
			setDrawCurrent(null);
			setDrawMode(null);
			return;
		}

		// Drag mode: finish on mouseup
		if (drawMode === "drag") {
			finishDraw(drawStart, pt);
			return;
		}

		// No drag detected: enter click-move-click mode
		if (drawMode === null) {
			setDrawMode("click");
			// drawStart stays, preview will follow mouse
		}
	}

	function handleWheel(e: React.WheelEvent) {
		e.preventDefault();
		const factor = e.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.min(Math.max(viewport.zoom * factor, 0.1), 5);

		if (!svgRef.current) return;
		const rect = svgRef.current.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		onViewportChange({
			x: mx - (mx - viewport.x) * (newZoom / viewport.zoom),
			y: my - (my - viewport.y) * (newZoom / viewport.zoom),
			zoom: newZoom,
		});
	}

	function handleEntityMouseDown(e: React.MouseEvent, id: string) {
		if (activeTool !== "select") return;
		e.stopPropagation();
		entityClickedRef.current = true;
		onSelectEntity(id);

		const pt = getCanvasPoint(e);
		const entity = entities.find((ent) => ent.id === id);
		if (!entity) return;

		// Get origin position based on entity type
		let originX = 0;
		let originY = 0;
		if (entity.type === "wall") {
			originX = entity.x1;
			originY = entity.y1;
		} else if (entity.type === "room") {
			originX = entity.polygon[0][0];
			originY = entity.polygon[0][1];
		} else if ("x" in entity && "y" in entity) {
			originX = (entity as { x: number }).x;
			originY = (entity as { y: number }).y;
		}

		setDragEntity({
			id,
			startX: pt.x,
			startY: pt.y,
			originX,
			originY,
		});
	}

	function handleEntityClick(e: React.MouseEvent, _id: string) {
		if (activeTool !== "select") return;
		e.stopPropagation();
		entityClickedRef.current = true;
	}

	function handleCanvasClick() {
		if (entityClickedRef.current) {
			entityClickedRef.current = false;
			return;
		}
		if (activeTool === "select") {
			onSelectEntity(null);
		}
	}

	const visibleEntities = entities.filter(
		(e) => visibleLayers[e.layer as keyof LayerVisibility],
	);
	const visibleWalls = visibleEntities.filter(
		(e): e is WallEntity => e.type === "wall",
	);
	const wallChains = buildWallChains(visibleWalls);
	// Rough heuristic for which side of a wall is "outside": away from the
	// average of every wall endpoint. Holds for a single convex-ish building
	// footprint; breaks down for oddly-shaped or multi-wing floor plans.
	const buildingCenter = (() => {
		if (visibleWalls.length === 0) return { x: 0, y: 0 };
		let sx = 0;
		let sy = 0;
		for (const w of visibleWalls) {
			sx += w.x1 + w.x2;
			sy += w.y1 + w.y2;
		}
		return {
			x: sx / (visibleWalls.length * 2),
			y: sy / (visibleWalls.length * 2),
		};
	})();

	return (
		<svg
			ref={svgRef}
			className="flex-1 bg-muted/30 select-none"
			style={{ cursor: activeTool === "pan" ? "grab" : "crosshair" }}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onWheel={handleWheel}
			onClick={handleCanvasClick}
		>
			<g
				transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}
			>
				{/* Blueprint underlay */}
				{underlay && underlayUrl && (
					<image
						href={underlayUrl}
						x={underlay.x}
						y={underlay.y}
						width={underlay.width}
						height={underlay.height}
						opacity={underlay.opacity}
						preserveAspectRatio="none"
					/>
				)}

				{/* Grid */}
				{gridEnabled && (
					<g opacity={0.15}>
						{Array.from(
							{ length: Math.ceil(CANVAS_SIZE / gridSize) + 1 },
							(_, i) => (
								<line
									key={`gx-${i}`}
									x1={i * gridSize}
									y1={0}
									x2={i * gridSize}
									y2={CANVAS_SIZE}
									stroke="currentColor"
									strokeWidth={0.5}
								/>
							),
						)}
						{Array.from(
							{ length: Math.ceil(CANVAS_SIZE / gridSize) + 1 },
							(_, i) => (
								<line
									key={`gy-${i}`}
									x1={0}
									y1={i * gridSize}
									x2={CANVAS_SIZE}
									y2={i * gridSize}
									stroke="currentColor"
									strokeWidth={0.5}
								/>
							),
						)}
					</g>
				)}

				{/* Wall bodies — chain-grouped so shared corners get a real
				    mitered join instead of each wall drawing its own
				    independent rectangle (which left overlapping spikes). */}
				{wallChains.map((chain, i) => (
					<WallChainShape key={`wallchain-${i}`} chain={chain} />
				))}

				{/* Wall click/select targets — invisible unless selected;
				    the visible wall body is the chain shape above. */}
				{visibleWalls.map((wall) => {
					const isSelected = selectedEntityIds.includes(wall.id);
					return (
						<polygon
							key={wall.id}
							points={wallPolygonPoints(wall)}
							fill={isSelected ? "rgba(37, 99, 235, 0.3)" : "transparent"}
							stroke={isSelected ? "#2563eb" : "none"}
							strokeWidth={isSelected ? 2.5 : 0}
							onMouseDown={(e) => handleEntityMouseDown(e, wall.id)}
							onClick={(e) => handleEntityClick(e, wall.id)}
							className="cursor-pointer"
						/>
					);
				})}

				{/* Other entities */}
				{visibleEntities
					.filter((e) => e.type !== "wall")
					.map((entity) => (
						<EntityRenderer
							key={entity.id}
							entity={entity}
							isSelected={selectedEntityIds.includes(entity.id)}
							units={units}
							zoom={viewport.zoom}
							onMouseDown={(e) => handleEntityMouseDown(e, entity.id)}
							onClick={(e) => handleEntityClick(e, entity.id)}
						/>
					))}

				{/* Wall dimension chains (architect-plan style) */}
				{visibleWalls.map((wall) => (
					<WallDimensionLine
						key={`dim-${wall.id}`}
						wall={wall}
						allWalls={visibleWalls}
						buildingCenter={buildingCenter}
						units={units}
						zoom={viewport.zoom}
					/>
				))}

				{/* Room vertex handles */}
				{activeTool === "select" &&
					visibleEntities
						.filter(
							(e) => e.type === "room" && selectedEntityIds.includes(e.id),
						)
						.map((entity) =>
							entity.type === "room"
								? entity.polygon.map(([px, py], i) => (
										<circle
											key={`vtx-${entity.id}-${i}`}
											cx={px}
											cy={py}
											r={5 / viewport.zoom}
											fill="white"
											stroke="#2563eb"
											strokeWidth={1.5 / viewport.zoom}
											className="cursor-move"
											onMouseDown={(e) => {
												e.stopPropagation();
												const pt = getCanvasPoint(e);
												setVertexDrag({
													entityId: entity.id,
													vertexIndex: i,
													startX: pt.x,
													startY: pt.y,
												});
											}}
										/>
									))
								: null,
						)}

				{/* Box entity resize & rotate handles */}
				{activeTool === "select" &&
					visibleEntities
						.filter(
							(e) =>
								selectedEntityIds.includes(e.id) &&
								"width" in e &&
								"height" in e &&
								"rotation" in e &&
								"x" in e &&
								"y" in e,
						)
						.map((entity) => {
							const ent = entity as Entity & {
								x: number;
								y: number;
								width: number;
								height: number;
								rotation: number;
							};
							const cx = ent.x + ent.width / 2;
							const cy = ent.y + ent.height / 2;
							const r = 5 / viewport.zoom;
							const rotHandleDist = 25 / viewport.zoom;
							const corners: {
								handle: "tl" | "tr" | "bl" | "br";
								hx: number;
								hy: number;
							}[] = [
								{ handle: "tl", hx: ent.x, hy: ent.y },
								{ handle: "tr", hx: ent.x + ent.width, hy: ent.y },
								{ handle: "bl", hx: ent.x, hy: ent.y + ent.height },
								{
									handle: "br",
									hx: ent.x + ent.width,
									hy: ent.y + ent.height,
								},
							];
							return (
								<g
									key={`handles-${entity.id}`}
									transform={`rotate(${ent.rotation}, ${cx}, ${cy})`}
								>
									{corners.map(({ handle, hx, hy }) => (
										<rect
											key={`rsz-${entity.id}-${handle}`}
											x={hx - r}
											y={hy - r}
											width={r * 2}
											height={r * 2}
											fill="white"
											stroke="#2563eb"
											strokeWidth={1.5 / viewport.zoom}
											className="cursor-nwse-resize"
											onMouseDown={(e) => {
												e.stopPropagation();
												const pt = getCanvasPoint(e);
												setResizeDrag({
													entityId: entity.id,
													handle,
													startX: pt.x,
													startY: pt.y,
													origX: ent.x,
													origY: ent.y,
													origW: ent.width,
													origH: ent.height,
												});
											}}
										/>
									))}
									{/* Rotation handle */}
									<line
										x1={cx}
										y1={ent.y}
										x2={cx}
										y2={ent.y - rotHandleDist}
										stroke="#2563eb"
										strokeWidth={1 / viewport.zoom}
									/>
									<circle
										cx={cx}
										cy={ent.y - rotHandleDist}
										r={r}
										fill="white"
										stroke="#2563eb"
										strokeWidth={1.5 / viewport.zoom}
										className="cursor-grab"
										onMouseDown={(e) => {
											e.stopPropagation();
											setRotateDrag({
												entityId: entity.id,
												centerX: cx,
												centerY: cy,
											});
										}}
									/>
								</g>
							);
						})}

				{/* Wall endpoint handles */}
				{activeTool === "select" &&
					visibleEntities
						.filter(
							(e) => e.type === "wall" && selectedEntityIds.includes(e.id),
						)
						.map((entity) => {
							if (entity.type !== "wall") return null;
							const r = 5 / viewport.zoom;
							const endpoints: {
								key: string;
								px: number;
								py: number;
								fields: Record<string, number>;
							}[] = [
								{
									key: "p1",
									px: entity.x1,
									py: entity.y1,
									fields: { x1: 1, y1: 1 },
								},
								{
									key: "p2",
									px: entity.x2,
									py: entity.y2,
									fields: { x2: 1, y2: 1 },
								},
							];
							return endpoints.map(({ key, px, py, fields }) => (
								<circle
									key={`wall-ep-${entity.id}-${key}`}
									cx={px}
									cy={py}
									r={r}
									fill="white"
									stroke="#2563eb"
									strokeWidth={1.5 / viewport.zoom}
									className="cursor-move"
									onMouseDown={(e) => {
										e.stopPropagation();
										const pt = getCanvasPoint(e);
										setVertexDrag({
											entityId: entity.id,
											vertexIndex: fields.x1 ? 0 : 1,
											startX: pt.x,
											startY: pt.y,
										});
									}}
								/>
							));
						})}

				{/* Door/Window width handles */}
				{activeTool === "select" &&
					visibleEntities
						.filter(
							(e) =>
								(e.type === "door" || e.type === "window") &&
								selectedEntityIds.includes(e.id),
						)
						.map((entity) => {
							if (entity.type !== "door" && entity.type !== "window")
								return null;
							const r = 5 / viewport.zoom;
							const rad = (entity.rotation * Math.PI) / 180;
							const hw = entity.width / 2;
							const p1x = entity.x - hw * Math.cos(rad);
							const p1y = entity.y - hw * Math.sin(rad);
							const p2x = entity.x + hw * Math.cos(rad);
							const p2y = entity.y + hw * Math.sin(rad);
							return [
								{ key: "e1", px: p1x, py: p1y },
								{ key: "e2", px: p2x, py: p2y },
							].map(({ key, px, py }) => (
								<circle
									key={`op-ep-${entity.id}-${key}`}
									cx={px}
									cy={py}
									r={r}
									fill="white"
									stroke="#2563eb"
									strokeWidth={1.5 / viewport.zoom}
									className="cursor-ew-resize"
									onMouseDown={(e) => {
										e.stopPropagation();
										const pt = getCanvasPoint(e);
										setResizeDrag({
											entityId: entity.id,
											handle: key === "e1" ? "tl" : "br",
											startX: pt.x,
											startY: pt.y,
											origX: entity.x,
											origY: entity.y,
											origW: entity.width,
											origH: 0,
										});
									}}
								/>
							));
						})}

				{/* Draw preview */}
				{drawStart && drawCurrent && activeTool === "wall" && (
					<line
						x1={drawStart.x}
						y1={drawStart.y}
						x2={drawCurrent.x}
						y2={drawCurrent.y}
						stroke="#2563eb"
						strokeWidth={20}
						opacity={0.5}
					/>
				)}
				{drawStart &&
					drawCurrent &&
					(activeTool === "door" || activeTool === "window") && (
						<line
							x1={drawStart.x}
							y1={drawStart.y}
							x2={drawCurrent.x}
							y2={drawCurrent.y}
							stroke={activeTool === "door" ? "#a8d8ea" : "#87ceeb"}
							strokeWidth={activeTool === "door" ? 10 : 6}
							strokeLinecap="round"
							opacity={0.6}
						/>
					)}
				{drawStart && drawCurrent && activeTool === "room" && (
					<rect
						x={Math.min(drawStart.x, drawCurrent.x)}
						y={Math.min(drawStart.y, drawCurrent.y)}
						width={Math.abs(drawCurrent.x - drawStart.x)}
						height={Math.abs(drawCurrent.y - drawStart.y)}
						fill="#2563eb"
						opacity={0.15}
						stroke="#2563eb"
						strokeWidth={1}
						strokeDasharray="4 2"
					/>
				)}

				{/* Measure tool preview (while drawing) */}
				{drawStart && drawCurrent && activeTool === "measure" && (
					<MeasureOverlay
						start={drawStart}
						end={drawCurrent}
						zoom={viewport.zoom}
					/>
				)}

				{/* Measure tool result (after completing measurement) */}
				{measurement && activeTool === "measure" && (
					<MeasureOverlay
						start={measurement.start}
						end={measurement.end}
						zoom={viewport.zoom}
					/>
				)}
			</g>
		</svg>
	);
}

function EntityRenderer({
	entity,
	isSelected,
	units,
	zoom,
	onMouseDown,
	onClick,
}: {
	entity: Entity;
	isSelected: boolean;
	units: string;
	zoom: number;
	onMouseDown: (e: React.MouseEvent) => void;
	onClick: (e: React.MouseEvent) => void;
}) {
	const SELECT_COLOR = "#2563eb";
	const SELECT_FILL = "rgba(37, 99, 235, 0.15)";
	const SELECT_FILL_STRONG = "rgba(37, 99, 235, 0.3)";

	switch (entity.type) {
		case "room": {
			const cx =
				entity.polygon.reduce((s, [x]) => s + x, 0) / entity.polygon.length;
			const cy =
				entity.polygon.reduce((s, [, y]) => s + y, 0) / entity.polygon.length;
			const area = polygonArea(entity.polygon);
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
				>
					<polygon
						points={entity.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
						fill={isSelected ? SELECT_FILL : "rgba(0, 0, 0, 0.03)"}
						stroke={isSelected ? SELECT_COLOR : "#666"}
						strokeWidth={isSelected ? 2 : 1}
						strokeDasharray={isSelected ? "none" : "6 3"}
					>
						<title>{entity.name}</title>
					</polygon>
					<text
						x={cx}
						y={cy - 7 / zoom}
						textAnchor="middle"
						fontSize={13 / zoom}
						fontWeight={600}
						fill="#333"
						style={{ pointerEvents: "none", userSelect: "none" }}
					>
						{entity.name}
					</text>
					<text
						x={cx}
						y={cy + 9 / zoom}
						textAnchor="middle"
						fontSize={11 / zoom}
						fill="#777"
						style={{ pointerEvents: "none", userSelect: "none" }}
					>
						{formatArea(area, units)}
					</text>
				</g>
			);
		}
		case "door": {
			const doorW = entity.width;
			const isSliding = entity.doorStyle === "sliding";
			const stroke = isSelected ? SELECT_COLOR : "#333";
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
					transform={`rotate(${entity.rotation}, ${entity.x}, ${entity.y})`}
				>
					{/* Wall opening — white gap to clear the wall underneath */}
					<rect
						x={entity.x - doorW / 2}
						y={entity.y - 5}
						width={doorW}
						height={10}
						fill="white"
						stroke="none"
					/>
					{/* Opening edges */}
					<line
						x1={entity.x - doorW / 2}
						y1={entity.y - 5}
						x2={entity.x - doorW / 2}
						y2={entity.y + 5}
						stroke={stroke}
						strokeWidth={1.5}
					/>
					<line
						x1={entity.x + doorW / 2}
						y1={entity.y - 5}
						x2={entity.x + doorW / 2}
						y2={entity.y + 5}
						stroke={stroke}
						strokeWidth={1.5}
					/>
					{isSliding ? (
						<>
							{/* Sliding door — arrow showing slide direction */}
							<line
								x1={entity.x - doorW / 2}
								y1={entity.y}
								x2={entity.x + doorW / 2}
								y2={entity.y}
								stroke={stroke}
								strokeWidth={isSelected ? 2.5 : 2}
								strokeLinecap="round"
							/>
							{/* Dashed line showing pocket/track */}
							<line
								x1={entity.x - doorW / 2}
								y1={entity.y + 4}
								x2={entity.x + doorW / 2}
								y2={entity.y + 4}
								stroke={isSelected ? SELECT_COLOR : "#999"}
								strokeWidth={1}
								strokeDasharray="3 2"
							/>
							{/* Arrow indicating slide direction */}
							{entity.swing === "left" ? (
								<polyline
									points={`${entity.x - doorW / 4 + 4},${entity.y - 3} ${entity.x - doorW / 4},${entity.y} ${entity.x - doorW / 4 + 4},${entity.y + 3}`}
									fill="none"
									stroke={stroke}
									strokeWidth={1.5}
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							) : (
								<polyline
									points={`${entity.x + doorW / 4 - 4},${entity.y - 3} ${entity.x + doorW / 4},${entity.y} ${entity.x + doorW / 4 - 4},${entity.y + 3}`}
									fill="none"
									stroke={stroke}
									strokeWidth={1.5}
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							)}
						</>
					) : (
						<>
							{/* Regular door — swing arc */}
							{(() => {
								const swingLeft = entity.swing === "left";
								const hingeX = swingLeft
									? entity.x - doorW / 2
									: entity.x + doorW / 2;
								const hingeY = entity.y;
								const tipX = swingLeft
									? entity.x + doorW / 2
									: entity.x - doorW / 2;
								const tipY = entity.y;
								const arcEndX = hingeX;
								const arcEndY = hingeY + doorW;
								const sweepFlag = swingLeft ? 1 : 0;
								return (
									<>
										<line
											x1={hingeX}
											y1={hingeY}
											x2={hingeX}
											y2={hingeY + doorW}
											stroke={stroke}
											strokeWidth={isSelected ? 2.5 : 2}
											strokeLinecap="round"
										/>
										<path
											d={`M ${tipX} ${tipY} A ${doorW} ${doorW} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`}
											fill="none"
											stroke={isSelected ? SELECT_COLOR : "#999"}
											strokeWidth={isSelected ? 1.5 : 1}
											strokeDasharray="4 3"
										/>
										<circle cx={hingeX} cy={hingeY} r={2.5} fill={stroke} />
									</>
								);
							})()}
						</>
					)}
				</g>
			);
		}
		case "window":
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
				>
					<rect
						x={entity.x - entity.width / 2}
						y={entity.y - 3}
						width={entity.width}
						height={6}
						fill={isSelected ? SELECT_FILL_STRONG : "#87ceeb"}
						stroke={isSelected ? SELECT_COLOR : "#333"}
						strokeWidth={isSelected ? 2 : 1}
						transform={`rotate(${entity.rotation}, ${entity.x}, ${entity.y})`}
					/>
				</g>
			);
		case "light":
			return (
				<circle
					cx={entity.x}
					cy={entity.y}
					r={8}
					fill={isSelected ? SELECT_FILL_STRONG : "#ffd700"}
					stroke={isSelected ? SELECT_COLOR : "#b8860b"}
					strokeWidth={isSelected ? 2.5 : 1.5}
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
				/>
			);
		case "outlet":
			return (
				<rect
					x={entity.x - 6}
					y={entity.y - 6}
					width={12}
					height={12}
					rx={2}
					fill={isSelected ? SELECT_FILL_STRONG : "#90ee90"}
					stroke={isSelected ? SELECT_COLOR : "#228b22"}
					strokeWidth={isSelected ? 2.5 : 1.5}
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
				/>
			);
		case "furniture":
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
				>
					<rect
						x={entity.x}
						y={entity.y}
						width={entity.width}
						height={entity.height}
						fill={isSelected ? SELECT_FILL : "#deb887"}
						stroke={isSelected ? SELECT_COLOR : "#8b7355"}
						strokeWidth={isSelected ? 2 : 1}
						rx={2}
						transform={`rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})`}
					/>
					<text
						x={entity.x + entity.width / 2}
						y={entity.y + entity.height / 2}
						textAnchor="middle"
						dominantBaseline="middle"
						fontSize={10}
						fill="#333"
					>
						{entity.name}
					</text>
				</g>
			);
		case "annotation":
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
				>
					<rect
						x={entity.x - 2}
						y={entity.y - 12}
						width={entity.text.length * 6 + 8}
						height={18}
						fill={isSelected ? SELECT_FILL : "#fff3cd"}
						stroke={isSelected ? SELECT_COLOR : "#ffc107"}
						strokeWidth={1}
						rx={3}
					/>
					<text x={entity.x + 2} y={entity.y} fontSize={11} fill="#333">
						{entity.text}
					</text>
				</g>
			);
		case "sink":
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
					transform={`rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})`}
				>
					<rect
						x={entity.x}
						y={entity.y}
						width={entity.width}
						height={entity.height}
						fill={isSelected ? SELECT_FILL : "#b3d9ff"}
						stroke={isSelected ? SELECT_COLOR : "#4a90d9"}
						strokeWidth={isSelected ? 2 : 1.5}
						rx={4}
					/>
					<ellipse
						cx={entity.x + entity.width / 2}
						cy={entity.y + entity.height / 2}
						rx={entity.width * 0.3}
						ry={entity.height * 0.3}
						fill="none"
						stroke={isSelected ? SELECT_COLOR : "#4a90d9"}
						strokeWidth={1}
					/>
					<text
						x={entity.x + entity.width / 2}
						y={entity.y + entity.height + 12}
						textAnchor="middle"
						fontSize={9}
						fill="#555"
					>
						{entity.label || "Sink"}
					</text>
				</g>
			);
		case "toilet":
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
					transform={`rotate(${entity.rotation}, ${entity.x}, ${entity.y})`}
				>
					{/* Tank */}
					<rect
						x={entity.x - 18}
						y={entity.y - 25}
						width={36}
						height={15}
						fill={isSelected ? SELECT_FILL : "#e0e0e0"}
						stroke={isSelected ? SELECT_COLOR : "#999"}
						strokeWidth={isSelected ? 2 : 1.5}
						rx={3}
					/>
					{/* Bowl */}
					<ellipse
						cx={entity.x}
						cy={entity.y}
						rx={18}
						ry={22}
						fill={isSelected ? SELECT_FILL : "#f0f0f0"}
						stroke={isSelected ? SELECT_COLOR : "#999"}
						strokeWidth={isSelected ? 2 : 1.5}
					/>
					<text
						x={entity.x}
						y={entity.y + 35}
						textAnchor="middle"
						fontSize={9}
						fill="#555"
					>
						{entity.label || "Toilet"}
					</text>
				</g>
			);
		case "shower":
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
					transform={`rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})`}
				>
					<rect
						x={entity.x}
						y={entity.y}
						width={entity.width}
						height={entity.height}
						fill={isSelected ? SELECT_FILL : "#d4eaff"}
						stroke={isSelected ? SELECT_COLOR : "#6ba3d6"}
						strokeWidth={isSelected ? 2 : 1.5}
						rx={2}
						strokeDasharray="4 2"
					/>
					{/* Drain circle */}
					<circle
						cx={entity.x + entity.width / 2}
						cy={entity.y + entity.height / 2}
						r={6}
						fill="none"
						stroke={isSelected ? SELECT_COLOR : "#6ba3d6"}
						strokeWidth={1}
					/>
					<text
						x={entity.x + entity.width / 2}
						y={entity.y + entity.height + 12}
						textAnchor="middle"
						fontSize={9}
						fill="#555"
					>
						{entity.label || "Shower"}
					</text>
				</g>
			);
		case "bathtub":
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
					transform={`rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})`}
				>
					<rect
						x={entity.x}
						y={entity.y}
						width={entity.width}
						height={entity.height}
						fill={isSelected ? SELECT_FILL : "#cce5ff"}
						stroke={isSelected ? SELECT_COLOR : "#4a90d9"}
						strokeWidth={isSelected ? 2 : 2}
						rx={entity.height / 2}
					/>
					{/* Inner shape */}
					<rect
						x={entity.x + 5}
						y={entity.y + 5}
						width={entity.width - 10}
						height={entity.height - 10}
						fill="none"
						stroke={isSelected ? SELECT_COLOR : "#4a90d9"}
						strokeWidth={0.5}
						rx={(entity.height - 10) / 2}
					/>
					<text
						x={entity.x + entity.width / 2}
						y={entity.y + entity.height + 12}
						textAnchor="middle"
						fontSize={9}
						fill="#555"
					>
						{entity.label || "Bathtub"}
					</text>
				</g>
			);
		case "stairs": {
			const stepCount = Math.max(3, Math.round(entity.height / 25));
			const stepH = entity.height / stepCount;
			const isUp = entity.direction === "up";
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
					transform={`rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})`}
				>
					<rect
						x={entity.x}
						y={entity.y}
						width={entity.width}
						height={entity.height}
						fill={isSelected ? SELECT_FILL : "#f0ece4"}
						stroke={isSelected ? SELECT_COLOR : "#8b7355"}
						strokeWidth={isSelected ? 2 : 1.5}
					/>
					{Array.from({ length: stepCount - 1 }, (_, i) => (
						<line
							key={`step-${i}`}
							x1={entity.x}
							y1={entity.y + stepH * (i + 1)}
							x2={entity.x + entity.width}
							y2={entity.y + stepH * (i + 1)}
							stroke={isSelected ? SELECT_COLOR : "#8b7355"}
							strokeWidth={0.8}
						/>
					))}
					{/* Direction arrow */}
					<line
						x1={entity.x + entity.width / 2}
						y1={isUp ? entity.y + entity.height - 10 : entity.y + 10}
						x2={entity.x + entity.width / 2}
						y2={isUp ? entity.y + 10 : entity.y + entity.height - 10}
						stroke={isSelected ? SELECT_COLOR : "#555"}
						strokeWidth={1.5}
						markerEnd="none"
					/>
					<polyline
						points={
							isUp
								? `${entity.x + entity.width / 2 - 6},${entity.y + 20} ${entity.x + entity.width / 2},${entity.y + 10} ${entity.x + entity.width / 2 + 6},${entity.y + 20}`
								: `${entity.x + entity.width / 2 - 6},${entity.y + entity.height - 20} ${entity.x + entity.width / 2},${entity.y + entity.height - 10} ${entity.x + entity.width / 2 + 6},${entity.y + entity.height - 20}`
						}
						fill="none"
						stroke={isSelected ? SELECT_COLOR : "#555"}
						strokeWidth={1.5}
						strokeLinejoin="round"
					/>
					<text
						x={entity.x + entity.width / 2}
						y={entity.y + entity.height + 12}
						textAnchor="middle"
						fontSize={9}
						fill="#555"
					>
						{entity.label || (isUp ? "Up" : "Down")}
					</text>
				</g>
			);
		}
	}
}

// Perpendicular distance from a wall's own endpoint to the face of another
// wall connected there (shared endpoint), so the dimension can start/end at
// the interior corner instead of the centerline meeting point. For walls
// crossing at angle theta, a connected wall's face (offset thickness/2 from
// its own centerline) crosses this wall's centerline at (thickness/2)/sin(theta)
// from the shared point — see line-intersection derivation; perpendicular
// corners (theta=90°) reduce to the familiar thickness/2 inset.
function wallEndInset(
	point: { x: number; y: number },
	dirA: { x: number; y: number },
	walls: WallEntity[],
	selfId: string,
): number {
	const EPS = 0.5;
	let maxInset = 0;
	for (const w of walls) {
		if (w.id === selfId) continue;
		const touches = (
			[
				[w.x1, w.y1],
				[w.x2, w.y2],
			] as [number, number][]
		).some(([ex, ey]) => Math.hypot(ex - point.x, ey - point.y) < EPS);
		if (!touches) continue;

		const bdx = w.x2 - w.x1;
		const bdy = w.y2 - w.y1;
		const blen = Math.hypot(bdx, bdy) || 1;
		const dirB = { x: bdx / blen, y: bdy / blen };
		const sinTheta = Math.abs(dirA.x * dirB.y - dirA.y * dirB.x);
		if (sinTheta < 0.05) continue; // near-parallel — straight run, not a corner
		const inset = w.thickness / 2 / sinTheta;
		if (inset > maxInset) maxInset = inset;
	}
	return maxInset;
}

// ponytail: dimension always offsets to the same fixed side of the wall
// (no room-interior detection), so on some walls it lands inside the room
// instead of outside; upgrade path is testing offset points against room
// polygons and flipping the side when the offset point is contained.
// ponytail: at a T-junction picks the thickest connected wall for the
// inset, not necessarily the one that actually bounds this wall's room;
// a full fix needs the room polygon each wall borders.
function WallDimensionLine({
	wall,
	allWalls,
	buildingCenter,
	units,
	zoom,
}: {
	wall: WallEntity;
	allWalls: WallEntity[];
	buildingCenter: { x: number; y: number };
	units: string;
	zoom: number;
}) {
	const length = distance(
		{ x: wall.x1, y: wall.y1 },
		{ x: wall.x2, y: wall.y2 },
	);
	if (length < 1) return null;

	const dx = wall.x2 - wall.x1;
	const dy = wall.y2 - wall.y1;
	const ux = dx / length;
	const uy = dy / length;
	let perpX = -uy;
	let perpY = ux;
	// Point the dimension outward (away from the building's rough center)
	// instead of always turning the same way relative to how the wall was
	// drawn — otherwise two walls at a corner can both offset toward the
	// same side and their dimension chains overlap/hide each other.
	const wallMidX = (wall.x1 + wall.x2) / 2;
	const wallMidY = (wall.y1 + wall.y2) / 2;
	const outX = wallMidX - buildingCenter.x;
	const outY = wallMidY - buildingCenter.y;
	if (perpX * outX + perpY * outY < 0) {
		perpX = -perpX;
		perpY = -perpY;
	}

	// Inset each end by the connected wall's face so the shown dimension is
	// the interior clear span, not the centerline-to-centerline length.
	const insetStart = Math.min(
		wallEndInset(
			{ x: wall.x1, y: wall.y1 },
			{ x: ux, y: uy },
			allWalls,
			wall.id,
		),
		length / 2,
	);
	const insetEnd = Math.min(
		wallEndInset(
			{ x: wall.x2, y: wall.y2 },
			{ x: ux, y: uy },
			allWalls,
			wall.id,
		),
		length / 2,
	);
	const clearLength = Math.max(length - insetStart - insetEnd, 0);
	if (clearLength < 1) return null;
	const label = formatLength(clearLength, units);

	const start = { x: wall.x1 + ux * insetStart, y: wall.y1 + uy * insetStart };
	const end = { x: wall.x2 - ux * insetEnd, y: wall.y2 - uy * insetEnd };

	const faceOffset = wall.thickness / 2;
	const lineOffset = faceOffset + 24 / zoom;
	const extendPast = 4 / zoom;
	const tickLen = 6 / zoom;
	const sw = 1 / zoom;

	const p1 = {
		x: start.x + perpX * lineOffset,
		y: start.y + perpY * lineOffset,
	};
	const p2 = {
		x: end.x + perpX * lineOffset,
		y: end.y + perpY * lineOffset,
	};

	function extensionLine(x: number, y: number) {
		return {
			x1: x + perpX * faceOffset,
			y1: y + perpY * faceOffset,
			x2: x + perpX * (lineOffset + extendPast),
			y2: y + perpY * (lineOffset + extendPast),
		};
	}
	const e1 = extensionLine(start.x, start.y);
	const e2 = extensionLine(end.x, end.y);

	function tick(cx: number, cy: number) {
		const hx = (ux + perpX) * (tickLen / 2);
		const hy = (uy + perpY) * (tickLen / 2);
		return { x1: cx - hx, y1: cy - hy, x2: cx + hx, y2: cy + hy };
	}
	const t1 = tick(p1.x, p1.y);
	const t2 = tick(p2.x, p2.y);

	const midX = (p1.x + p2.x) / 2;
	const midY = (p1.y + p2.y) / 2;
	let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
	if (angle > 90 || angle < -90) angle += 180;

	const fontSize = 10 / zoom;
	const labelW = label.length * fontSize * 0.62;

	return (
		<g stroke="#555" style={{ pointerEvents: "none", userSelect: "none" }}>
			<line x1={e1.x1} y1={e1.y1} x2={e1.x2} y2={e1.y2} strokeWidth={sw} />
			<line x1={e2.x1} y1={e2.y1} x2={e2.x2} y2={e2.y2} strokeWidth={sw} />
			<line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} strokeWidth={sw} />
			<line x1={t1.x1} y1={t1.y1} x2={t1.x2} y2={t1.y2} strokeWidth={sw} />
			<line x1={t2.x1} y1={t2.y1} x2={t2.x2} y2={t2.y2} strokeWidth={sw} />
			<rect
				x={midX - labelW / 2}
				y={midY - fontSize * 0.75}
				width={labelW}
				height={fontSize * 1.5}
				fill="white"
				stroke="none"
				transform={`rotate(${angle}, ${midX}, ${midY})`}
			/>
			<text
				x={midX}
				y={midY}
				textAnchor="middle"
				dominantBaseline="middle"
				fontSize={fontSize}
				fill="#333"
				fontWeight={500}
				stroke="none"
				transform={`rotate(${angle}, ${midX}, ${midY})`}
			>
				{label}
			</text>
		</g>
	);
}

function MeasureOverlay({
	start,
	end,
	zoom,
}: {
	start: { x: number; y: number };
	end: { x: number; y: number };
	zoom: number;
}) {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const distanceCm = Math.sqrt(dx * dx + dy * dy);
	const distanceM = distanceCm / 100;
	const label =
		distanceCm >= 100
			? `${distanceM.toFixed(2)} m`
			: `${Math.round(distanceCm)} cm`;

	const midX = (start.x + end.x) / 2;
	const midY = (start.y + end.y) / 2;
	// Offset the label perpendicular to the line
	const perpX = -dy / (distanceCm || 1);
	const perpY = dx / (distanceCm || 1);
	const labelOffset = 14 / zoom;
	const labelX = midX + perpX * labelOffset;
	const labelY = midY + perpY * labelOffset;

	const endpointR = 4 / zoom;
	const fontSize = 12 / zoom;

	return (
		<g>
			{/* Measurement line */}
			<line
				x1={start.x}
				y1={start.y}
				x2={end.x}
				y2={end.y}
				stroke="#e11d48"
				strokeWidth={1.5 / zoom}
				strokeDasharray={`${6 / zoom} ${3 / zoom}`}
			/>
			{/* Start point */}
			<circle
				cx={start.x}
				cy={start.y}
				r={endpointR}
				fill="#e11d48"
				stroke="white"
				strokeWidth={1 / zoom}
			/>
			{/* End point */}
			<circle
				cx={end.x}
				cy={end.y}
				r={endpointR}
				fill="#e11d48"
				stroke="white"
				strokeWidth={1 / zoom}
			/>
			{/* Distance label background */}
			{distanceCm > 0 && (
				<>
					<rect
						x={labelX - label.length * fontSize * 0.35}
						y={labelY - fontSize * 0.7}
						width={label.length * fontSize * 0.7}
						height={fontSize * 1.4}
						fill="white"
						stroke="#e11d48"
						strokeWidth={1 / zoom}
						rx={3 / zoom}
					/>
					<text
						x={labelX}
						y={labelY + fontSize * 0.35}
						textAnchor="middle"
						fontSize={fontSize}
						fill="#e11d48"
						fontWeight="600"
					>
						{label}
					</text>
				</>
			)}
		</g>
	);
}
