export type Entity =
	| WallEntity
	| RoomEntity
	| DoorEntity
	| WindowEntity
	| LightEntity
	| OutletEntity
	| FurnitureEntity
	| AnnotationEntity;

export type EntityType =
	| "wall"
	| "room"
	| "door"
	| "window"
	| "light"
	| "outlet"
	| "furniture"
	| "annotation";

interface BaseEntity {
	id: string;
	type: EntityType;
	layer: string;
	locked?: boolean;
}

export interface WallEntity extends BaseEntity {
	type: "wall";
	layer: "structure";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	thickness: number;
}

export interface RoomEntity extends BaseEntity {
	type: "room";
	layer: "structure";
	name: string;
	polygon: [number, number][];
}

export interface DoorEntity extends BaseEntity {
	type: "door";
	layer: "structure";
	x: number;
	y: number;
	width: number;
	rotation: number;
	wallId: string;
	swing: "left" | "right";
}

export interface WindowEntity extends BaseEntity {
	type: "window";
	layer: "structure";
	x: number;
	y: number;
	width: number;
	rotation: number;
	wallId: string;
}

export interface LightEntity extends BaseEntity {
	type: "light";
	layer: "electrical";
	x: number;
	y: number;
	roomId?: string;
	label?: string;
}

export interface OutletEntity extends BaseEntity {
	type: "outlet";
	layer: "electrical";
	x: number;
	y: number;
	roomId?: string;
	label?: string;
}

export interface FurnitureEntity extends BaseEntity {
	type: "furniture";
	layer: "furniture";
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	name: string;
}

export interface AnnotationEntity extends BaseEntity {
	type: "annotation";
	layer: "notes";
	x: number;
	y: number;
	text: string;
}
