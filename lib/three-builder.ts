import type { Entity } from "@/types/entities";

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

export function buildScene3D(
	entities: Entity[],
	elevationCm: number,
): Object3D[] {
	const objects: Object3D[] = [];
	const baseY = elevationCm * SCALE;

	for (const e of entities) {
		switch (e.type) {
			case "wall": {
				const x1 = e.x1 * SCALE;
				const z1 = e.y1 * SCALE;
				const x2 = e.x2 * SCALE;
				const z2 = e.y2 * SCALE;
				const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
				const thickness = e.thickness * SCALE;
				const cx = (x1 + x2) / 2;
				const cz = (z1 + z2) / 2;
				// Angle of the wall in the XZ plane
				const angle = Math.atan2(z2 - z1, x2 - x1);

				objects.push({
					type: "box",
					x: cx,
					y: baseY + WALL_HEIGHT / 2,
					z: cz,
					width: length,
					height: WALL_HEIGHT,
					depth: thickness,
					rotationY: -angle,
					color: COLORS.wall,
				});
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
				objects.push({
					type: "box",
					x: e.x * SCALE,
					y: baseY + 1.0,
					z: e.y * SCALE,
					width: e.width * SCALE,
					height: 2.0,
					depth: 0.08,
					rotationY: -rotRad,
					color: COLORS.door,
				});
				break;
			}
			case "window": {
				const rotRad = degToRad(e.rotation);
				objects.push({
					type: "box",
					x: e.x * SCALE,
					y: baseY + 1.3,
					z: e.y * SCALE,
					width: e.width * SCALE,
					height: 1.0,
					depth: 0.06,
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
