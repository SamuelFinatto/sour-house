import type { Entity, EntityType } from "./entities";
import type { LayerName } from "./floor";

export type Tool =
	| "select"
	| "pan"
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
	| "measure";

export interface Viewport {
	x: number;
	y: number;
	zoom: number;
}

export interface EditorState {
	activeTool: Tool;
	selectedEntityIds: string[];
	viewport: Viewport;
	visibleLayers: Record<LayerName, boolean>;
	gridEnabled: boolean;
	snapEnabled: boolean;
}

export interface HistoryEntry {
	entities: Entity[];
	timestamp: number;
}

export interface CanvasPoint {
	x: number;
	y: number;
}

export interface DragState {
	start: CanvasPoint;
	current: CanvasPoint;
	entityId?: string;
}

export interface ToolConfig {
	type: EntityType;
	label: string;
	icon: string;
	layer: LayerName;
}
