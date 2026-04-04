"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { polygonArea, polygonPerimeter } from "@/lib/geometry";
import { formatArea, formatLength } from "@/lib/units";
import type {
	DoorEntity,
	Entity,
	FurnitureEntity,
	RoomEntity,
	WallEntity,
	WindowEntity,
} from "@/types/entities";

interface InspectorProps {
	entity: Entity | null;
	units: string;
	onUpdate: (id: string, updates: Partial<Entity>) => void;
	onDelete: (id: string) => void;
}

export function Inspector({
	entity,
	units,
	onUpdate,
	onDelete,
}: InspectorProps) {
	if (!entity) {
		return (
			<div className="p-3">
				<p className="text-sm text-muted-foreground">
					Select an element to inspect
				</p>
			</div>
		);
	}

	return (
		<div className="p-3 space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium capitalize">{entity.type}</h3>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => onDelete(entity.id)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>

			<Separator />

			<div className="space-y-2 text-sm">
				<div>
					<Label className="text-xs">ID</Label>
					<p className="text-muted-foreground font-mono text-xs truncate">
						{entity.id}
					</p>
				</div>

				{entity.type === "wall" && (
					<WallFields
						entity={entity}
						onUpdate={(u) => onUpdate(entity.id, u)}
					/>
				)}
				{entity.type === "room" && (
					<RoomFields
						entity={entity}
						units={units}
						onUpdate={(u) => onUpdate(entity.id, u)}
					/>
				)}
				{(entity.type === "door" || entity.type === "window") && (
					<OpeningFields
						entity={entity}
						onUpdate={(u) => onUpdate(entity.id, u)}
					/>
				)}
				{entity.type === "door" && (
					<DoorStyleFields
						entity={entity}
						onUpdate={(u) => onUpdate(entity.id, u)}
					/>
				)}
				{entity.type === "furniture" && (
					<FurnitureFields
						entity={entity}
						onUpdate={(u) => onUpdate(entity.id, u)}
					/>
				)}
				{(entity.type === "sink" ||
					entity.type === "shower" ||
					entity.type === "bathtub") && (
					<PlumbingFixtureFields
						entity={
							entity as Entity & {
								width: number;
								height: number;
								rotation: number;
								label?: string;
							}
						}
						onUpdate={(u) => onUpdate(entity.id, u)}
					/>
				)}
				{entity.type === "toilet" && (
					<PlumbingPointFields
						entity={entity}
						onUpdate={(u) => onUpdate(entity.id, u)}
					/>
				)}
				{(entity.type === "light" ||
					entity.type === "outlet" ||
					entity.type === "annotation") && (
					<PointFields
						entity={entity}
						onUpdate={(u) => onUpdate(entity.id, u)}
					/>
				)}
			</div>
		</div>
	);
}

function WallFields({
	entity,
	onUpdate,
}: {
	entity: WallEntity;
	onUpdate: (u: Partial<WallEntity>) => void;
}) {
	return (
		<>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Label className="text-xs">X1</Label>
					<Input
						type="number"
						value={entity.x1}
						onChange={(e) => onUpdate({ x1: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
				<div>
					<Label className="text-xs">Y1</Label>
					<Input
						type="number"
						value={entity.y1}
						onChange={(e) => onUpdate({ y1: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
				<div>
					<Label className="text-xs">X2</Label>
					<Input
						type="number"
						value={entity.x2}
						onChange={(e) => onUpdate({ x2: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
				<div>
					<Label className="text-xs">Y2</Label>
					<Input
						type="number"
						value={entity.y2}
						onChange={(e) => onUpdate({ y2: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
			</div>
			<div>
				<Label className="text-xs">Thickness</Label>
				<Input
					type="number"
					value={entity.thickness}
					onChange={(e) => onUpdate({ thickness: Number(e.target.value) })}
					className="h-7 text-xs"
				/>
			</div>
		</>
	);
}

function RoomFields({
	entity,
	units,
	onUpdate,
}: {
	entity: RoomEntity;
	units: string;
	onUpdate: (u: Partial<RoomEntity>) => void;
}) {
	const area = polygonArea(entity.polygon);
	const perimeter = polygonPerimeter(entity.polygon);

	return (
		<>
			<div>
				<Label className="text-xs">Name</Label>
				<Input
					value={entity.name}
					onChange={(e) => onUpdate({ name: e.target.value })}
					className="h-7 text-xs"
				/>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Label className="text-xs">Area</Label>
					<p className="text-xs text-muted-foreground">
						{formatArea(area, units)}
					</p>
				</div>
				<div>
					<Label className="text-xs">Perimeter</Label>
					<p className="text-xs text-muted-foreground">
						{formatLength(perimeter, units)}
					</p>
				</div>
			</div>
		</>
	);
}

function OpeningFields({
	entity,
	onUpdate,
}: {
	entity: DoorEntity | WindowEntity;
	onUpdate: (u: Partial<DoorEntity | WindowEntity>) => void;
}) {
	return (
		<>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Label className="text-xs">X</Label>
					<Input
						type="number"
						value={entity.x}
						onChange={(e) => onUpdate({ x: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
				<div>
					<Label className="text-xs">Y</Label>
					<Input
						type="number"
						value={entity.y}
						onChange={(e) => onUpdate({ y: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Label className="text-xs">Width</Label>
					<Input
						type="number"
						value={entity.width}
						onChange={(e) => onUpdate({ width: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
				<div>
					<Label className="text-xs">Rotation</Label>
					<Input
						type="number"
						value={entity.rotation}
						onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
			</div>
		</>
	);
}

function DoorStyleFields({
	entity,
	onUpdate,
}: {
	entity: DoorEntity;
	onUpdate: (u: Partial<DoorEntity>) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-2">
			<div>
				<Label className="text-xs">Style</Label>
				<Select
					value={entity.doorStyle ?? "regular"}
					onValueChange={(v) =>
						onUpdate({ doorStyle: v as "regular" | "sliding" })
					}
				>
					<SelectTrigger className="h-7 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="regular">Regular</SelectItem>
						<SelectItem value="sliding">Sliding</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div>
				<Label className="text-xs">Swing</Label>
				<Select
					value={entity.swing}
					onValueChange={(v) => onUpdate({ swing: v as "left" | "right" })}
				>
					<SelectTrigger className="h-7 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="left">Left</SelectItem>
						<SelectItem value="right">Right</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

function FurnitureFields({
	entity,
	onUpdate,
}: {
	entity: FurnitureEntity;
	onUpdate: (u: Partial<FurnitureEntity>) => void;
}) {
	return (
		<>
			<div>
				<Label className="text-xs">Name</Label>
				<Input
					value={entity.name}
					onChange={(e) => onUpdate({ name: e.target.value })}
					className="h-7 text-xs"
				/>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Label className="text-xs">Width</Label>
					<Input
						type="number"
						value={entity.width}
						onChange={(e) => onUpdate({ width: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
				<div>
					<Label className="text-xs">Height</Label>
					<Input
						type="number"
						value={entity.height}
						onChange={(e) => onUpdate({ height: Number(e.target.value) })}
						className="h-7 text-xs"
					/>
				</div>
			</div>
		</>
	);
}

function PointFields({
	entity,
	onUpdate,
}: {
	entity: Entity & { x: number; y: number };
	onUpdate: (u: Partial<Entity>) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-2">
			<div>
				<Label className="text-xs">X</Label>
				<Input
					type="number"
					value={entity.x}
					onChange={(e) =>
						onUpdate({ x: Number(e.target.value) } as Partial<Entity>)
					}
					className="h-7 text-xs"
				/>
			</div>
			<div>
				<Label className="text-xs">Y</Label>
				<Input
					type="number"
					value={entity.y}
					onChange={(e) =>
						onUpdate({ y: Number(e.target.value) } as Partial<Entity>)
					}
					className="h-7 text-xs"
				/>
			</div>
		</div>
	);
}

function PlumbingFixtureFields({
	entity,
	onUpdate,
}: {
	entity: Entity & {
		width: number;
		height: number;
		rotation: number;
		label?: string;
	};
	onUpdate: (u: Partial<Entity>) => void;
}) {
	return (
		<>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Label className="text-xs">Width</Label>
					<Input
						type="number"
						value={entity.width}
						onChange={(e) =>
							onUpdate({ width: Number(e.target.value) } as Partial<Entity>)
						}
						className="h-7 text-xs"
					/>
				</div>
				<div>
					<Label className="text-xs">Height</Label>
					<Input
						type="number"
						value={entity.height}
						onChange={(e) =>
							onUpdate({ height: Number(e.target.value) } as Partial<Entity>)
						}
						className="h-7 text-xs"
					/>
				</div>
			</div>
			<div>
				<Label className="text-xs">Rotation</Label>
				<Input
					type="number"
					value={entity.rotation}
					onChange={(e) =>
						onUpdate({ rotation: Number(e.target.value) } as Partial<Entity>)
					}
					className="h-7 text-xs"
				/>
			</div>
			<div>
				<Label className="text-xs">Label</Label>
				<Input
					value={entity.label ?? ""}
					onChange={(e) =>
						onUpdate({ label: e.target.value } as Partial<Entity>)
					}
					className="h-7 text-xs"
				/>
			</div>
		</>
	);
}

function PlumbingPointFields({
	entity,
	onUpdate,
}: {
	entity: Entity & { x: number; y: number; rotation: number; label?: string };
	onUpdate: (u: Partial<Entity>) => void;
}) {
	return (
		<>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Label className="text-xs">X</Label>
					<Input
						type="number"
						value={entity.x}
						onChange={(e) =>
							onUpdate({ x: Number(e.target.value) } as Partial<Entity>)
						}
						className="h-7 text-xs"
					/>
				</div>
				<div>
					<Label className="text-xs">Y</Label>
					<Input
						type="number"
						value={entity.y}
						onChange={(e) =>
							onUpdate({ y: Number(e.target.value) } as Partial<Entity>)
						}
						className="h-7 text-xs"
					/>
				</div>
			</div>
			<div>
				<Label className="text-xs">Rotation</Label>
				<Input
					type="number"
					value={entity.rotation}
					onChange={(e) =>
						onUpdate({ rotation: Number(e.target.value) } as Partial<Entity>)
					}
					className="h-7 text-xs"
				/>
			</div>
			<div>
				<Label className="text-xs">Label</Label>
				<Input
					value={entity.label ?? ""}
					onChange={(e) =>
						onUpdate({ label: e.target.value } as Partial<Entity>)
					}
					className="h-7 text-xs"
				/>
			</div>
		</>
	);
}
