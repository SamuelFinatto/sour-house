import type { Entity } from "./entities";

export interface FloorSymbol {
	id: string;
	name: string;
	entities: Entity[];
	boundingBox: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	createdAt: string;
}
