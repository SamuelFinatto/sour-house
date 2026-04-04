"use client";

import {
	Armchair,
	Eye,
	EyeOff,
	Layers,
	MessageSquare,
	Pipette,
	Ruler,
	Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LayerName, LayerVisibility } from "@/types/floor";

interface LayersPanelProps {
	layers: LayerVisibility;
	onToggle: (layer: LayerName) => void;
	onShowAll: () => void;
	onHideAll: () => void;
}

const layerConfig: { name: LayerName; label: string; icon: React.ReactNode }[] =
	[
		{
			name: "structure",
			label: "Structure",
			icon: <Ruler className="h-4 w-4" />,
		},
		{
			name: "furniture",
			label: "Furniture",
			icon: <Armchair className="h-4 w-4" />,
		},
		{
			name: "electrical",
			label: "Electrical",
			icon: <Zap className="h-4 w-4" />,
		},
		{
			name: "plumbing",
			label: "Plumbing",
			icon: <Pipette className="h-4 w-4" />,
		},
		{
			name: "notes",
			label: "Notes",
			icon: <MessageSquare className="h-4 w-4" />,
		},
	];

export function LayersPanel({
	layers,
	onToggle,
	onShowAll,
	onHideAll,
}: LayersPanelProps) {
	const allVisible = Object.values(layers).every(Boolean);
	const _allHidden = Object.values(layers).every((v) => !v);

	return (
		<div className="p-3 space-y-1">
			<div className="flex items-center justify-between mb-2">
				<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
					<Layers className="h-3 w-3" />
					Layers
				</h3>
				<Button
					variant="ghost"
					size="xs"
					onClick={allVisible ? onHideAll : onShowAll}
					className="text-xs text-muted-foreground"
				>
					{allVisible ? "Hide all" : "Show all"}
				</Button>
			</div>
			{layerConfig.map(({ name, label, icon }) => (
				<Button
					key={name}
					variant="ghost"
					size="sm"
					className="w-full justify-start gap-2"
					onClick={() => onToggle(name)}
				>
					{icon}
					<span className="flex-1 text-left">{label}</span>
					{layers[name] ? (
						<Eye className="h-3 w-3 text-muted-foreground" />
					) : (
						<EyeOff className="h-3 w-3 text-muted-foreground/40" />
					)}
				</Button>
			))}
		</div>
	);
}
