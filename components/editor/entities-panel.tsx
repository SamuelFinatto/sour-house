"use client";

import { Button } from "@/components/ui/button";
import type { Entity } from "@/types/entities";
import type { LayerVisibility } from "@/types/floor";
import {
	Armchair,
	DoorOpen,
	Lightbulb,
	List,
	MessageSquare,
	Plug,
	Ruler,
	Square,
} from "lucide-react";

interface EntitiesPanelProps {
	entities: Entity[];
	visibleLayers: LayerVisibility;
	selectedEntityIds: string[];
	onSelect: (id: string | null) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
	wall: <Ruler className="h-3 w-3" />,
	room: <Square className="h-3 w-3" />,
	door: <DoorOpen className="h-3 w-3" />,
	window: <Square className="h-3 w-3" />,
	light: <Lightbulb className="h-3 w-3" />,
	outlet: <Plug className="h-3 w-3" />,
	furniture: <Armchair className="h-3 w-3" />,
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
	}
}

export function EntitiesPanel({
	entities,
	visibleLayers,
	selectedEntityIds,
	onSelect,
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
					{visibleEntities.map((entity) => (
						<Button
							key={entity.id}
							variant={selectedEntityIds.includes(entity.id) ? "secondary" : "ghost"}
							size="sm"
							className="w-full justify-start gap-2 h-7"
							onClick={() => onSelect(entity.id)}
						>
							{typeIcons[entity.type]}
							<span className="flex-1 text-left text-xs truncate">
								{entityLabel(entity)}
							</span>
							<span className="text-[10px] text-muted-foreground capitalize">
								{entity.layer}
							</span>
						</Button>
					))}
				</div>
			)}
		</div>
	);
}
