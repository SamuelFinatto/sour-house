export type Entity =
	| WallEntity
	| RoomEntity
	| DoorEntity
	| WindowEntity
	| LightEntity
	| OutletEntity
	| FurnitureEntity
	| AnnotationEntity
	| SinkEntity
	| ToiletEntity
	| ShowerEntity
	| BathtubEntity
	| StairsEntity;

export type EntityType =
	| "wall"
	| "room"
	| "door"
	| "window"
	| "light"
	| "outlet"
	| "furniture"
	| "annotation"
	| "sink"
	| "toilet"
	| "shower"
	| "bathtub"
	| "stairs";

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

export interface RoomImage {
	assetId: string;
	name: string;
}

export interface RoomEntity extends BaseEntity {
	type: "room";
	layer: "structure";
	name: string;
	polygon: [number, number][];
	images?: RoomImage[];
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
	doorStyle?: "regular" | "sliding";
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

export type FurnitureKind =
	| "generic"
	| "bed"
	| "table"
	| "chair"
	| "sofa"
	| "desk"
	| "bookshelf"
	| "wardrobe"
	| "tv";

export const FURNITURE_DEFAULTS: Record<
	FurnitureKind,
	{ width: number; height: number; name: string }
> = {
	generic: { width: 80, height: 60, name: "Item" },
	bed: { width: 200, height: 140, name: "Bed" },
	table: { width: 120, height: 80, name: "Table" },
	chair: { width: 50, height: 50, name: "Chair" },
	sofa: { width: 200, height: 90, name: "Sofa" },
	desk: { width: 140, height: 70, name: "Desk" },
	bookshelf: { width: 80, height: 30, name: "Bookshelf" },
	wardrobe: { width: 120, height: 60, name: "Wardrobe" },
	tv: { width: 120, height: 8, name: "TV" },
};

export interface FurnitureEntity extends BaseEntity {
	type: "furniture";
	layer: "furniture";
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	name: string;
	furnitureType?: FurnitureKind;
}

export interface AnnotationEntity extends BaseEntity {
	type: "annotation";
	layer: "notes";
	x: number;
	y: number;
	text: string;
}

export interface SinkEntity extends BaseEntity {
	type: "sink";
	layer: "plumbing";
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	label?: string;
}

export interface ToiletEntity extends BaseEntity {
	type: "toilet";
	layer: "plumbing";
	x: number;
	y: number;
	rotation: number;
	label?: string;
}

export interface ShowerEntity extends BaseEntity {
	type: "shower";
	layer: "plumbing";
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	label?: string;
}

export interface BathtubEntity extends BaseEntity {
	type: "bathtub";
	layer: "plumbing";
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	label?: string;
}

export interface StairsEntity extends BaseEntity {
	type: "stairs";
	layer: "structure";
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	direction: "up" | "down";
	label?: string;
}
