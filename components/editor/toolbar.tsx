"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Tool } from "@/types/editor";
import {
	Armchair,
	DoorOpen,
	Grid3X3,
	Hand,
	Lightbulb,
	Magnet,
	MessageSquare,
	MousePointer2,
	AppWindow,
	Plug,
	Redo2,
	Ruler,
	Square,
	Undo2,
} from "lucide-react";

interface ToolbarProps {
	activeTool: Tool;
	gridEnabled: boolean;
	snapEnabled: boolean;
	onSelectTool: (tool: Tool) => void;
	onToggleGrid: () => void;
	onToggleSnap: () => void;
	onUndo: () => void;
	onRedo: () => void;
}

const tools: { tool: Tool; icon: React.ReactNode; label: string }[] = [
	{ tool: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Select" },
	{ tool: "pan", icon: <Hand className="h-4 w-4" />, label: "Pan" },
	{ tool: "wall", icon: <Ruler className="h-4 w-4" />, label: "Wall" },
	{ tool: "room", icon: <Square className="h-4 w-4" />, label: "Room" },
	{ tool: "door", icon: <DoorOpen className="h-4 w-4" />, label: "Door" },
	{ tool: "window", icon: <AppWindow className="h-4 w-4" />, label: "Window" },
	{ tool: "light", icon: <Lightbulb className="h-4 w-4" />, label: "Light" },
	{ tool: "outlet", icon: <Plug className="h-4 w-4" />, label: "Outlet" },
	{ tool: "furniture", icon: <Armchair className="h-4 w-4" />, label: "Furniture" },
	{ tool: "annotation", icon: <MessageSquare className="h-4 w-4" />, label: "Note" },
];

export function Toolbar({
	activeTool,
	gridEnabled,
	snapEnabled,
	onSelectTool,
	onToggleGrid,
	onToggleSnap,
	onUndo,
	onRedo,
}: ToolbarProps) {
	return (
		<div className="flex items-center gap-1 p-2 border-b bg-background overflow-x-auto">
			{tools.map(({ tool, icon, label }) => (
				<Button
					key={tool}
					variant={activeTool === tool ? "secondary" : "ghost"}
					size="icon-sm"
					onClick={() => onSelectTool(tool)}
					title={label}
				>
					{icon}
				</Button>
			))}

			<Separator orientation="vertical" className="mx-1 h-6" />

			<Button
				variant={gridEnabled ? "secondary" : "ghost"}
				size="icon-sm"
				onClick={onToggleGrid}
				title="Toggle Grid"
			>
				<Grid3X3 className="h-4 w-4" />
			</Button>
			<Button
				variant={snapEnabled ? "secondary" : "ghost"}
				size="icon-sm"
				onClick={onToggleSnap}
				title="Toggle Snap"
			>
				<Magnet className="h-4 w-4" />
			</Button>

			<Separator orientation="vertical" className="mx-1 h-6" />

			<Button variant="ghost" size="icon-sm" onClick={onUndo} title="Undo">
				<Undo2 className="h-4 w-4" />
			</Button>
			<Button variant="ghost" size="icon-sm" onClick={onRedo} title="Redo">
				<Redo2 className="h-4 w-4" />
			</Button>
		</div>
	);
}
