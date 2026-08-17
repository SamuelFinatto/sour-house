"use client";

import {
	Armchair,
	Bath,
	ChevronDown,
	ChevronsDown,
	ChevronsUp,
	ChevronUp,
	DoorOpen,
	Droplets,
	Lightbulb,
	List,
	MessageSquare,
	Plug,
	Ruler,
	ShowerHead,
	Square,
	Toilet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { distance } from "@/lib/geometry";
import { formatLength } from "@/lib/units";
import type { Entity } from "@/types/entities";
import type { LayerVisibility } from "@/types/floor";

interface EntitiesPanelProps {
	entities: Entity[];
	visibleLayers: LayerVisibility;
	selectedEntityIds: string[];
	units: string;
	onSelect: (id: string | null) => void;
	onMove: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
}

const typeIcons: Record<string, React.ReactNode> = {
	wall: <Ruler className="h-3 w-3" />,
	room: <Square className="h-3 w-3" />,
	door: <DoorOpen className="h-3 w-3" />,
	window: <Square className="h-3 w-3" />,
	light: <Lightbulb className="h-3 w-3" />,
	outlet: <Plug className="h-3 w-3" />,
	furniture: <Armchair className="h-3 w-3" />,
	sink: <Droplets className="h-3 w-3" />,
	toilet: <Toilet className="h-3 w-3" />,
	shower: <ShowerHead className="h-3 w-3" />,
	bathtub: <Bath className="h-3 w-3" />,
	annotation: <MessageSquare className="h-3 w-3" />,
};

function entityLabel(entity: Entity): string {
	switch (entity.type) {
		case "room":
			return entity.name || "Room";
		case "furniture":
			return entity.name || "Furniture";
		case "annotation":
			return entity.text || "Note";
		case "wall":
			return "Wall";
		case "door":
			return "Door";
		case "window":
			return "Window";
		case "light":
			return entity.label || "Light";
		case "outlet":
			return entity.label || "Outlet";
		case "sink":
			return entity.label || "Sink";
		case "toilet":
			return entity.label || "Toilet";
		case "shower":
			return entity.label || "Shower";
		case "bathtub":
			return entity.label || "Bathtub";
		case "stairs":
			return (
				entity.label ||
				(entity.direction === "up" ? "Stairs Up" : "Stairs Down")
			);
	}
}

/** Formats an entity's dimensions in meters (or the floor's units), when applicable. */
function entityDimensions(entity: Entity, units: string): string | null {
	switch (entity.type) {
		case "wall":
			return formatLength(
				distance(
					{ x: entity.x1, y: entity.y1 },
					{ x: entity.x2, y: entity.y2 },
				),
				units,
			);
		case "door":
		case "window":
			return formatLength(entity.width, units);
		case "furniture":
		case "sink":
		case "shower":
		case "bathtub":
		case "stairs":
			return `${formatLength(entity.width, units)} × ${formatLength(entity.height, units)}`;
		default:
			return null;
	}
}

export function EntitiesPanel({
	entities,
	visibleLayers,
	selectedEntityIds,
	units,
	onSelect,
	onMove,
}: EntitiesPanelProps) {
	const visibleEntities = entities.filter(
		(e) => visibleLayers[e.layer as keyof LayerVisibility],
	);

	return (
		<div className="p-3 space-y-1">
			<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
				<List className="h-3 w-3" />
				Entities ({visibleEntities.length})
			</h3>
			{visibleEntities.length === 0 ? (
				<p className="text-xs text-muted-foreground">No entities</p>
			) : (
				<div className="space-y-0.5 max-h-60 overflow-y-auto">
					{visibleEntities.map((entity, index) => {
						const isSelected = selectedEntityIds.includes(entity.id);
						const dimensions = entityDimensions(entity, units);
						return (
							<div key={entity.id} className="flex items-center gap-0.5">
								<Button
									variant={isSelected ? "secondary" : "ghost"}
									size="sm"
									className="flex-1 justify-start gap-2 h-7 min-w-0"
									onClick={() => onSelect(entity.id)}
								>
									{typeIcons[entity.type]}
									<span className="flex-1 text-left text-xs truncate">
										{entityLabel(entity)}
									</span>
									{dimensions && (
										<span className="text-[10px] text-muted-foreground shrink-0">
											{dimensions}
										</span>
									)}
									<span className="text-[10px] text-muted-foreground capitalize">
										{entity.layer}
									</span>
								</Button>
								{isSelected && (
									<div className="flex flex-col">
										<button
											type="button"
											className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
											disabled={index === 0}
											onClick={() => onMove(entity.id, "top")}
											title="Move to top"
										>
											<ChevronsUp className="h-3 w-3" />
										</button>
										<button
											type="button"
											className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
											disabled={index === 0}
											onClick={() => onMove(entity.id, "up")}
											title="Move up"
										>
											<ChevronUp className="h-3 w-3" />
										</button>
										<button
											type="button"
											className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
											disabled={index === visibleEntities.length - 1}
											onClick={() => onMove(entity.id, "down")}
											title="Move down"
										>
											<ChevronDown className="h-3 w-3" />
										</button>
										<button
											type="button"
											className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
											disabled={index === visibleEntities.length - 1}
											onClick={() => onMove(entity.id, "bottom")}
											title="Move to bottom"
										>
											<ChevronsDown className="h-3 w-3" />
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
