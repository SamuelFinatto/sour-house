"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId, screenToCanvas, snapToGrid } from "@/lib/geometry";
import type { Tool, Viewport } from "@/types/editor";
import type { Entity } from "@/types/entities";
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
	underlay?: FloorUnderlay;
	underlayUrl?: string;
	onViewportChange: (viewport: Viewport) => void;
	onAddEntity: (entity: Entity) => void;
	onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
	onSelectEntity: (id: string | null) => void;
}

const CANVAS_SIZE = 2000;

export function Canvas({
	entities,
	viewport,
	activeTool,
	visibleLayers,
	gridEnabled,
	snapEnabled,
	gridSize,
	selectedEntityIds,
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
			onAddEntity({
				id: generateId(),
				type: "wall",
				layer: "structure",
				x1: start.x,
				y1: start.y,
				x2: end.x,
				y2: end.y,
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

		// Room vertex dragging
		if (vertexDrag) {
			const pt = getCanvasPoint(e);
			const entity = entities.find((ent) => ent.id === vertexDrag.entityId);
			if (entity?.type === "room") {
				const newPolygon = entity.polygon.map((p, i) =>
					i === vertexDrag.vertexIndex ? ([pt.x, pt.y] as [number, number]) : p,
				);
				onUpdateEntity(entity.id, { polygon: newPolygon } as Partial<Entity>);
			}
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

				{/* Entities */}
				{visibleEntities.map((entity) => (
					<EntityRenderer
						key={entity.id}
						entity={entity}
						isSelected={selectedEntityIds.includes(entity.id)}
						onMouseDown={(e) => handleEntityMouseDown(e, entity.id)}
						onClick={(e) => handleEntityClick(e, entity.id)}
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
	onMouseDown,
	onClick,
}: {
	entity: Entity;
	isSelected: boolean;
	onMouseDown: (e: React.MouseEvent) => void;
	onClick: (e: React.MouseEvent) => void;
}) {
	const SELECT_COLOR = "#2563eb";
	const SELECT_FILL = "rgba(37, 99, 235, 0.15)";
	const SELECT_FILL_STRONG = "rgba(37, 99, 235, 0.3)";

	switch (entity.type) {
		case "wall":
			return (
				<g
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
				>
					{isSelected && (
						<line
							x1={entity.x1}
							y1={entity.y1}
							x2={entity.x2}
							y2={entity.y2}
							stroke={SELECT_COLOR}
							strokeWidth={entity.thickness + 6}
							strokeLinecap="round"
							opacity={0.3}
						/>
					)}
					<line
						x1={entity.x1}
						y1={entity.y1}
						x2={entity.x2}
						y2={entity.y2}
						stroke="#333"
						strokeWidth={entity.thickness}
						strokeLinecap="round"
					/>
				</g>
			);
		case "room":
			return (
				<polygon
					points={entity.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
					fill={isSelected ? SELECT_FILL : "rgba(0, 0, 0, 0.04)"}
					stroke={isSelected ? SELECT_COLOR : "#666"}
					strokeWidth={isSelected ? 2 : 1}
					strokeDasharray={isSelected ? "none" : "6 3"}
					onMouseDown={onMouseDown}
					onClick={onClick}
					className="cursor-pointer"
				>
					<title>{entity.name}</title>
				</polygon>
			);
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
