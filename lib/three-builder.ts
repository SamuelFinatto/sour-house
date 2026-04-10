import type { DoorEntity, Entity, WindowEntity } from "@/types/entities";

export interface Box3D {
	type: "box";
	x: number;
	y: number;
	z: number;
	width: number;
	height: number;
	depth: number;
	rotationY: number;
	color: string;
}

export interface Plane3D {
	type: "plane";
	x: number;
	z: number;
	width: number;
	depth: number;
	y: number;
	color: string;
}

export type Object3D = Box3D | Plane3D;

const WALL_HEIGHT = 2.6; // meters
const DOOR_HEIGHT = 2.0;
const WINDOW_BOTTOM = 0.9;
const WINDOW_HEIGHT = 1.2;
const SCALE = 1 / 100; // 1 cm = 0.01 m

function degToRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

const COLORS = {
	wall: "#e0e0e0",
	floor: "#f5f0e8",
	door: "#8B4513",
	window: "#87CEEB",
	furniture: "#DEB887",
	light: "#FFD700",
	outlet: "#808080",
	sink: "#B0C4DE",
	toilet: "#F5F5F5",
	shower: "#ADD8E6",
	bathtub: "#E0E0E0",
	annotation: "#FFB6C1",
	stairs: "#C4B998",
};

interface Opening {
	t: number; // position along wall (0–1)
	halfW: number; // half-width in meters
	kind: "door" | "window";
}

function buildWallWithOpenings(
	x1: number,
	z1: number,
	x2: number,
	z2: number,
	thickness: number,
	angle: number,
	length: number,
	baseY: number,
	openings: Opening[],
	objects: Object3D[],
) {
	if (openings.length === 0) {
		objects.push({
			type: "box",
			x: (x1 + x2) / 2,
			y: baseY + WALL_HEIGHT / 2,
			z: (z1 + z2) / 2,
			width: length,
			height: WALL_HEIGHT,
			depth: thickness,
			rotationY: -angle,
			color: COLORS.wall,
		});
		return;
	}

	// Sort openings by position along wall
	const sorted = [...openings].sort((a, b) => a.t - b.t);

	// Direction vector along the wall
	const dx = (x2 - x1) / length;
	const dz = (z2 - z1) / length;

	// Build solid wall segments between openings, plus lintels/sills
	let cursor = 0; // current position in meters from x1,z1

	for (const op of sorted) {
		const center = op.t * length;
		const gapStart = Math.max(0, center - op.halfW);
		const gapEnd = Math.min(length, center + op.halfW);

		// Solid segment before this opening
		if (gapStart > cursor + 0.001) {
			const segLen = gapStart - cursor;
			const segMid = cursor + segLen / 2;
			objects.push({
				type: "box",
				x: x1 + dx * segMid,
				y: baseY + WALL_HEIGHT / 2,
				z: z1 + dz * segMid,
				width: segLen,
				height: WALL_HEIGHT,
				depth: thickness,
				rotationY: -angle,
				color: COLORS.wall,
			});
		}

		// Lintel/sill around the opening
		const gapMidX = x1 + dx * ((gapStart + gapEnd) / 2);
		const gapMidZ = z1 + dz * ((gapStart + gapEnd) / 2);
		const gapWidth = gapEnd - gapStart;

		if (op.kind === "door") {
			// Lintel above the door
			const lintelH = WALL_HEIGHT - DOOR_HEIGHT;
			if (lintelH > 0.01) {
				objects.push({
					type: "box",
					x: gapMidX,
					y: baseY + DOOR_HEIGHT + lintelH / 2,
					z: gapMidZ,
					width: gapWidth,
					height: lintelH,
					depth: thickness,
					rotationY: -angle,
					color: COLORS.wall,
				});
			}
		} else {
			// Wall below window (sill)
			if (WINDOW_BOTTOM > 0.01) {
				objects.push({
					type: "box",
					x: gapMidX,
					y: baseY + WINDOW_BOTTOM / 2,
					z: gapMidZ,
					width: gapWidth,
					height: WINDOW_BOTTOM,
					depth: thickness,
					rotationY: -angle,
					color: COLORS.wall,
				});
			}
			// Wall above window
			const windowTop = WINDOW_BOTTOM + WINDOW_HEIGHT;
			const aboveH = WALL_HEIGHT - windowTop;
			if (aboveH > 0.01) {
				objects.push({
					type: "box",
					x: gapMidX,
					y: baseY + windowTop + aboveH / 2,
					z: gapMidZ,
					width: gapWidth,
					height: aboveH,
					depth: thickness,
					rotationY: -angle,
					color: COLORS.wall,
				});
			}
		}

		cursor = gapEnd;
	}

	// Solid segment after last opening
	if (length > cursor + 0.001) {
		const segLen = length - cursor;
		const segMid = cursor + segLen / 2;
		objects.push({
			type: "box",
			x: x1 + dx * segMid,
			y: baseY + WALL_HEIGHT / 2,
			z: z1 + dz * segMid,
			width: segLen,
			height: WALL_HEIGHT,
			depth: thickness,
			rotationY: -angle,
			color: COLORS.wall,
		});
	}
}

export function buildScene3D(
	entities: Entity[],
	elevationCm: number,
): Object3D[] {
	const objects: Object3D[] = [];
	const baseY = elevationCm * SCALE;

	// Match openings (doors/windows) to nearest wall geometrically
	const walls = entities.filter((e) => e.type === "wall");
	const doorWindows = entities.filter(
		(e) => e.type === "door" || e.type === "window",
	) as (DoorEntity | WindowEntity)[];
	const openingsByWall = new Map<string, (DoorEntity | WindowEntity)[]>();
	for (const op of doorWindows) {
		let bestWallId = "";
		let bestDist = Infinity;
		for (const w of walls) {
			if (w.type !== "wall") continue;
			// Distance from point to line segment
			const ax = op.x - w.x1;
			const ay = op.y - w.y1;
			const bx = w.x2 - w.x1;
			const by = w.y2 - w.y1;
			const lenSq = bx * bx + by * by;
			const t =
				lenSq > 0 ? Math.max(0, Math.min(1, (ax * bx + ay * by) / lenSq)) : 0;
			const px = w.x1 + t * bx;
			const py = w.y1 + t * by;
			const dist = Math.sqrt((op.x - px) ** 2 + (op.y - py) ** 2);
			if (dist < bestDist) {
				bestDist = dist;
				bestWallId = w.id;
			}
		}
		if (bestWallId) {
			const list = openingsByWall.get(bestWallId) ?? [];
			list.push(op);
			openingsByWall.set(bestWallId, list);
		}
	}

	for (const e of entities) {
		switch (e.type) {
			case "wall": {
				const x1 = e.x1 * SCALE;
				const z1 = e.y1 * SCALE;
				const x2 = e.x2 * SCALE;
				const z2 = e.y2 * SCALE;
				const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
				const thickness = e.thickness * SCALE;
				const angle = Math.atan2(z2 - z1, x2 - x1);

				// Project any doors/windows onto this wall
				const wallOpenings = openingsByWall.get(e.id);
				const openings: Opening[] = [];
				if (wallOpenings) {
					for (const op of wallOpenings) {
						// Project opening center onto wall line (in cm space)
						const opx = op.x - e.x1;
						const opy = op.y - e.y1;
						const wallDx = e.x2 - e.x1;
						const wallDy = e.y2 - e.y1;
						const wallLen = Math.sqrt(wallDx ** 2 + wallDy ** 2);
						const t =
							wallLen > 0
								? (opx * wallDx + opy * wallDy) / (wallLen * wallLen)
								: 0.5;
						openings.push({
							t: Math.max(0, Math.min(1, t)),
							halfW: (op.width * SCALE) / 2,
							kind: op.type,
						});
					}
				}

				buildWallWithOpenings(
					x1,
					z1,
					x2,
					z2,
					thickness,
					angle,
					length,
					baseY,
					openings,
					objects,
				);
				break;
			}
			case "room": {
				let minX = Infinity;
				let minZ = Infinity;
				let maxX = -Infinity;
				let maxZ = -Infinity;
				for (const [px, py] of e.polygon) {
					minX = Math.min(minX, px * SCALE);
					minZ = Math.min(minZ, py * SCALE);
					maxX = Math.max(maxX, px * SCALE);
					maxZ = Math.max(maxZ, py * SCALE);
				}
				objects.push({
					type: "plane",
					x: (minX + maxX) / 2,
					z: (minZ + maxZ) / 2,
					width: maxX - minX,
					depth: maxZ - minZ,
					y: baseY,
					color: COLORS.floor,
				});
				break;
			}
			case "door": {
				const rotRad = degToRad(e.rotation);
				const doorWidth = e.width * SCALE;
				const isSliding = e.doorStyle === "sliding";

				if (isSliding) {
					// Sliding door: thin panel slid to one side along the wall
					const slideDir = e.swing === "left" ? -1 : 1;
					const slideOffset = (doorWidth / 2) * slideDir;
					const alongX = Math.cos(-rotRad) * slideOffset;
					const alongZ = -Math.sin(-rotRad) * slideOffset;
					objects.push({
						type: "box",
						x: e.x * SCALE + alongX,
						y: baseY + DOOR_HEIGHT / 2,
						z: e.y * SCALE + alongZ,
						width: doorWidth * 0.5,
						height: DOOR_HEIGHT,
						depth: 0.04,
						rotationY: -rotRad,
						color: "#A0522D",
					});
				} else {
					// Regular door: panel hinged from the swing side, open ~30°
					const swingSign = e.swing === "left" ? -1 : 1;
					// Hinge position: offset along wall from center to the swing side edge
					const hingeAlongWall = (doorWidth / 2) * swingSign;
					const hingeX = e.x * SCALE + Math.cos(-rotRad) * hingeAlongWall;
					const hingeZ = e.y * SCALE - Math.sin(-rotRad) * hingeAlongWall;
					// Door swings open 30° from wall plane, perpendicular outward
					const swingAngle = (Math.PI / 6) * -swingSign;
					const panelCenterLocal = doorWidth / 2;
					const panelAngle = -rotRad + Math.PI / 2 + swingAngle;
					const panelX = hingeX + Math.cos(panelAngle) * panelCenterLocal;
					const panelZ = hingeZ + Math.sin(panelAngle) * panelCenterLocal;
					objects.push({
						type: "box",
						x: panelX,
						y: baseY + DOOR_HEIGHT / 2,
						z: panelZ,
						width: doorWidth,
						height: DOOR_HEIGHT,
						depth: 0.05,
						rotationY: panelAngle - Math.PI / 2,
						color: COLORS.door,
					});
				}
				break;
			}
			case "window": {
				const rotRad = degToRad(e.rotation);
				objects.push({
					type: "box",
					x: e.x * SCALE,
					y: baseY + WINDOW_BOTTOM + WINDOW_HEIGHT / 2,
					z: e.y * SCALE,
					width: e.width * SCALE,
					height: WINDOW_HEIGHT,
					depth: 0.03,
					rotationY: -rotRad,
					color: COLORS.window,
				});
				break;
			}
			case "furniture": {
				const rotRad = degToRad(e.rotation);
				objects.push({
					type: "box",
					x: (e.x + e.width / 2) * SCALE,
					y: baseY + 0.4,
					z: (e.y + e.height / 2) * SCALE,
					width: e.width * SCALE,
					height: 0.8,
					depth: e.height * SCALE,
					rotationY: -rotRad,
					color: COLORS.furniture,
				});
				break;
			}
			case "sink": {
				const rotRad = degToRad(e.rotation);
				objects.push({
					type: "box",
					x: (e.x + e.width / 2) * SCALE,
					y: baseY + 0.42,
					z: (e.y + e.height / 2) * SCALE,
					width: e.width * SCALE,
					height: 0.85,
					depth: e.height * SCALE,
					rotationY: -rotRad,
					color: COLORS.sink,
				});
				break;
			}
			case "toilet": {
				const rotRad = degToRad(e.rotation);
				objects.push({
					type: "box",
					x: e.x * SCALE,
					y: baseY + 0.2,
					z: e.y * SCALE,
					width: 0.4,
					height: 0.4,
					depth: 0.6,
					rotationY: -rotRad,
					color: COLORS.toilet,
				});
				break;
			}
			case "shower": {
				const rotRad = degToRad(e.rotation);
				objects.push({
					type: "box",
					x: (e.x + e.width / 2) * SCALE,
					y: baseY + 1.0,
					z: (e.y + e.height / 2) * SCALE,
					width: e.width * SCALE,
					height: 2.0,
					depth: e.height * SCALE,
					rotationY: -rotRad,
					color: COLORS.shower,
				});
				break;
			}
			case "bathtub": {
				const rotRad = degToRad(e.rotation);
				objects.push({
					type: "box",
					x: (e.x + e.width / 2) * SCALE,
					y: baseY + 0.3,
					z: (e.y + e.height / 2) * SCALE,
					width: e.width * SCALE,
					height: 0.6,
					depth: e.height * SCALE,
					rotationY: -rotRad,
					color: COLORS.bathtub,
				});
				break;
			}
			case "stairs": {
				const rotRad = degToRad(e.rotation);
				const stairW = e.width * SCALE;
				const stairD = e.height * SCALE;
				const cx = (e.x + e.width / 2) * SCALE;
				const cz = (e.y + e.height / 2) * SCALE;
				const stepCount = Math.max(2, Math.round((e.height * SCALE) / 0.25));
				const stepDepth = stairD / stepCount;
				const stepHeight = WALL_HEIGHT / stepCount;
				const cosR = Math.cos(-rotRad);
				const sinR = Math.sin(-rotRad);

				for (let s = 0; s < stepCount; s++) {
					// Local offset along depth axis (z in local space), from front to back
					const localZ =
						-stairD / 2 +
						stepDepth * (e.direction === "up" ? s : stepCount - 1 - s) +
						stepDepth / 2;
					const h = stepHeight * (s + 1);
					// Rotate local offset by the entity rotation
					const worldX = cx + localZ * sinR;
					const worldZ = cz + localZ * cosR;

					objects.push({
						type: "box",
						x: worldX,
						y: baseY + h / 2,
						z: worldZ,
						width: stairW,
						height: h,
						depth: stepDepth,
						rotationY: -rotRad,
						color: COLORS.stairs,
					});
				}
				break;
			}
			case "light": {
				objects.push({
					type: "box",
					x: e.x * SCALE,
					y: baseY + WALL_HEIGHT - 0.05,
					z: e.y * SCALE,
					width: 0.15,
					height: 0.1,
					depth: 0.15,
					rotationY: 0,
					color: COLORS.light,
				});
				break;
			}
			case "outlet": {
				objects.push({
					type: "box",
					x: e.x * SCALE,
					y: baseY + 0.3,
					z: e.y * SCALE,
					width: 0.08,
					height: 0.12,
					depth: 0.04,
					rotationY: 0,
					color: COLORS.outlet,
				});
				break;
			}
		}
	}

	return objects;
}

export function getSceneBBox(objects: Object3D[]): {
	centerX: number;
	centerY: number;
	centerZ: number;
	size: number;
} {
	if (objects.length === 0) {
		return { centerX: 0, centerY: 0, centerZ: 0, size: 10 };
	}
	let minX = Infinity;
	let minY = Infinity;
	let minZ = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let maxZ = -Infinity;
	for (const obj of objects) {
		if (obj.type === "box") {
			const hw = obj.width / 2;
			const hh = obj.height / 2;
			const hd = obj.depth / 2;
			minX = Math.min(minX, obj.x - hw);
			maxX = Math.max(maxX, obj.x + hw);
			minY = Math.min(minY, obj.y - hh);
			maxY = Math.max(maxY, obj.y + hh);
			minZ = Math.min(minZ, obj.z - hd);
			maxZ = Math.max(maxZ, obj.z + hd);
		} else {
			const hw = obj.width / 2;
			const hd = obj.depth / 2;
			minX = Math.min(minX, obj.x - hw);
			maxX = Math.max(maxX, obj.x + hw);
			minY = Math.min(minY, obj.y);
			maxY = Math.max(maxY, obj.y);
			minZ = Math.min(minZ, obj.z - hd);
			maxZ = Math.max(maxZ, obj.z + hd);
		}
	}
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;
	const centerZ = (minZ + maxZ) / 2;
	const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
	return { centerX, centerY, centerZ, size };
}
