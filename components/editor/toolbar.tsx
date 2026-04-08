"use client";

import {
	AppWindow,
	Armchair,
	Bath,
	ChevronDown,
	DoorOpen,
	Droplets,
	Grid3X3,
	Hand,
	Lightbulb,
	Magnet,
	Maximize,
	MessageSquare,
	Minus,
	MousePointer2,
	PenLine,
	Plug,
	Plus,
	Redo2,
	Ruler,
	ShowerHead,
	Square,
	Toilet,
	Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { Tool } from "@/types/editor";

interface ToolbarProps {
	activeTool: Tool;
	gridEnabled: boolean;
	snapEnabled: boolean;
	zoom: number;
	onSelectTool: (tool: Tool) => void;
	onToggleGrid: () => void;
	onToggleSnap: () => void;
	onZoomChange: (zoom: number) => void;
	onFitView: () => void;
	onUndo: () => void;
	onRedo: () => void;
}

const coreTools: { tool: Tool; icon: React.ReactNode; label: string }[] = [
	{
		tool: "select",
		icon: <MousePointer2 className="h-4 w-4" />,
		label: "Select",
	},
	{ tool: "pan", icon: <Hand className="h-4 w-4" />, label: "Pan" },
	{ tool: "measure", icon: <Ruler className="h-4 w-4" />, label: "Measure" },
];

const structureTools: { tool: Tool; icon: React.ReactNode; label: string }[] = [
	{ tool: "wall", icon: <PenLine className="h-4 w-4" />, label: "Wall" },
	{ tool: "room", icon: <Square className="h-4 w-4" />, label: "Room" },
	{ tool: "door", icon: <DoorOpen className="h-4 w-4" />, label: "Door" },
	{ tool: "window", icon: <AppWindow className="h-4 w-4" />, label: "Window" },
];

const electricalTools: { tool: Tool; icon: React.ReactNode; label: string }[] =
	[
		{ tool: "light", icon: <Lightbulb className="h-4 w-4" />, label: "Light" },
		{ tool: "outlet", icon: <Plug className="h-4 w-4" />, label: "Outlet" },
	];

const plumbingTools: { tool: Tool; icon: React.ReactNode; label: string }[] = [
	{ tool: "sink", icon: <Droplets className="h-4 w-4" />, label: "Sink" },
	{ tool: "toilet", icon: <Toilet className="h-4 w-4" />, label: "Toilet" },
	{ tool: "shower", icon: <ShowerHead className="h-4 w-4" />, label: "Shower" },
	{ tool: "bathtub", icon: <Bath className="h-4 w-4" />, label: "Bathtub" },
];

const otherTools: { tool: Tool; icon: React.ReactNode; label: string }[] = [
	{
		tool: "furniture",
		icon: <Armchair className="h-4 w-4" />,
		label: "Furniture",
	},
	{
		tool: "annotation",
		icon: <MessageSquare className="h-4 w-4" />,
		label: "Note",
	},
];

function ToolDropdown({
	label,
	icon,
	tools,
	activeTool,
	onSelectTool,
}: {
	label: string;
	icon: React.ReactNode;
	tools: { tool: Tool; icon: React.ReactNode; label: string }[];
	activeTool: Tool;
	onSelectTool: (tool: Tool) => void;
}) {
	const isActive = tools.some((t) => t.tool === activeTool);
	const activeItem = tools.find((t) => t.tool === activeTool);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant={isActive ? "secondary" : "ghost"}
						size="sm"
						className="gap-1 px-2"
						title={label}
					/>
				}
			>
				{activeItem ? activeItem.icon : icon}
				<ChevronDown className="h-3 w-3" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{tools.map(({ tool, icon: toolIcon, label: toolLabel }) => (
					<DropdownMenuItem
						key={tool}
						onClick={() => onSelectTool(tool)}
						className={activeTool === tool ? "bg-accent" : ""}
					>
						{toolIcon}
						<span className="ml-2">{toolLabel}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

export function Toolbar({
	activeTool,
	gridEnabled,
	snapEnabled,
	zoom,
	onSelectTool,
	onToggleGrid,
	onToggleSnap,
	onZoomChange,
	onFitView,
	onUndo,
	onRedo,
}: ToolbarProps) {
	return (
		<div className="flex items-center gap-1 p-2 border-b bg-background overflow-x-auto">
			{/* Core tools */}
			{coreTools.map(({ tool, icon, label }) => (
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

			{/* Structure tools */}
			{structureTools.map(({ tool, icon, label }) => (
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

			{/* Electrical dropdown */}
			<ToolDropdown
				label="Electrical"
				icon={<Lightbulb className="h-4 w-4" />}
				tools={electricalTools}
				activeTool={activeTool}
				onSelectTool={onSelectTool}
			/>

			{/* Plumbing dropdown */}
			<ToolDropdown
				label="Plumbing"
				icon={<Droplets className="h-4 w-4" />}
				tools={plumbingTools}
				activeTool={activeTool}
				onSelectTool={onSelectTool}
			/>

			<Separator orientation="vertical" className="mx-1 h-6" />

			{/* Other tools */}
			{otherTools.map(({ tool, icon, label }) => (
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

			<Separator orientation="vertical" className="mx-1 h-6" />

			{/* Zoom controls */}
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => onZoomChange(Math.max(0.1, zoom / 1.2))}
				title="Zoom Out"
			>
				<Minus className="h-4 w-4" />
			</Button>

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="sm"
							className="px-2 min-w-[4rem] font-mono text-xs"
							title="Zoom level"
						/>
					}
				>
					{Math.round(zoom * 100)}%
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{ZOOM_PRESETS.map((preset) => (
						<DropdownMenuItem
							key={preset}
							onClick={() => onZoomChange(preset)}
							className={Math.abs(zoom - preset) < 0.01 ? "bg-accent" : ""}
						>
							{Math.round(preset * 100)}%
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => onZoomChange(Math.min(5, zoom * 1.2))}
				title="Zoom In"
			>
				<Plus className="h-4 w-4" />
			</Button>

			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onFitView}
				title="Fit to Content"
			>
				<Maximize className="h-4 w-4" />
			</Button>
		</div>
	);
}
