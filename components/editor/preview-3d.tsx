"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Download, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFloor } from "@/hooks/use-floor";
import { downloadPng, downloadSvg } from "@/lib/export";
import type { Box3D, Object3D, Plane3D } from "@/lib/three-builder";
import { buildScene3D } from "@/lib/three-builder";

interface Preview3DProps {
	projectId: string;
	floorId: string;
}

function BoxMesh({ obj }: { obj: Box3D }) {
	return (
		<mesh position={[obj.x, obj.y, obj.z]} rotation={[0, obj.rotationY, 0]}>
			<boxGeometry args={[obj.width, obj.height, obj.depth]} />
			<meshStandardMaterial color={obj.color} />
		</mesh>
	);
}

function FloorPlane({ obj }: { obj: Plane3D }) {
	return (
		<mesh position={[obj.x, obj.y, obj.z]} rotation={[-Math.PI / 2, 0, 0]}>
			<planeGeometry args={[obj.width, obj.depth]} />
			<meshStandardMaterial color={obj.color} />
		</mesh>
	);
}

function Scene({ objects }: { objects: Object3D[] }) {
	return (
		<>
			<ambientLight intensity={0.6} />
			<directionalLight position={[10, 20, 10]} intensity={0.8} />
			<OrbitControls makeDefault />
			{objects.map((obj, i) =>
				obj.type === "box" ? (
					<BoxMesh key={`box-${i}`} obj={obj} />
				) : (
					<FloorPlane key={`plane-${i}`} obj={obj} />
				),
			)}
		</>
	);
}

export function Preview3D({ projectId, floorId }: Preview3DProps) {
	const { floor, isLoading, mutate } = useFloor(projectId, floorId);
	const [headerPortal, setHeaderPortal] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const el = document.getElementById("floor-header-actions");
		if (el) setHeaderPortal(el);
	}, []);

	const objects = useMemo(() => {
		if (!floor) return [];
		return buildScene3D(floor.entities, floor.elevationCm);
	}, [floor]);

	const allLayers = {
		structure: true,
		furniture: true,
		electrical: true,
		plumbing: true,
		notes: true,
	} as const;

	const handleExportSvg = useCallback(() => {
		if (!floor) return;
		downloadSvg(floor.entities, allLayers, `${floor.name ?? "floor"}.svg`);
	}, [floor]);

	const handleExportPng = useCallback(async () => {
		if (!floor) return;
		try {
			await downloadPng(
				floor.entities,
				allLayers,
				`${floor.name ?? "floor"}.png`,
			);
		} catch {
			toast.error("Failed to export PNG");
		}
	}, [floor]);

	const handleExportJson = useCallback(() => {
		if (!floor) return;
		const blob = new Blob([JSON.stringify(floor, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${floor.name ?? "floor"}.json`;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
	}, [floor]);

	const handleSave = useCallback(async () => {
		if (!floor) return;
		try {
			const res = await fetch(
				`/api/projects/${projectId}/floors/${floorId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(floor),
				},
			);
			if (!res.ok) throw new Error("Failed to save");
			mutate();
			toast.success("Floor saved");
		} catch {
			toast.error("Failed to save floor");
		}
	}, [floor, projectId, floorId, mutate]);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!floor) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-muted-foreground">Floor not found</p>
			</div>
		);
	}

	const headerActions = (
		<div className="flex items-center gap-2">
			<span className="text-xs text-muted-foreground">
				({floor.entities.length} entities)
			</span>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button variant="outline" size="sm">
							<Download className="mr-2 h-3 w-3" />
							Export
						</Button>
					}
				/>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={handleExportSvg}>
						Export SVG
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleExportPng}>
						Export PNG
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleExportJson}>
						Export JSON
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<Button variant="outline" size="sm" onClick={handleSave}>
				<Save className="mr-2 h-3 w-3" />
				Save
			</Button>
		</div>
	);

	return (
		<div className="relative flex-1 min-h-0">
			{headerPortal && createPortal(headerActions, headerPortal)}
			<div className="absolute inset-0">
				<Canvas camera={{ position: [5, 8, 10], fov: 50 }}>
					<Scene objects={objects} />
				</Canvas>
			</div>
		</div>
	);
}
