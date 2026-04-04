import type { Entity } from "./entities";

export interface Floor {
	id: string;
	name: string;
	elevationCm: number;
	units: string;
	grid: GridSettings;
	layers: LayerVisibility;
	entities: Entity[];
	schemaVersion: string;
}

export interface GridSettings {
	enabled: boolean;
	size: number;
	snapToGrid: boolean;
}

export interface LayerVisibility {
	structure: boolean;
	furniture: boolean;
	electrical: boolean;
	plumbing: boolean;
	notes: boolean;
}

export type LayerName = keyof LayerVisibility;
