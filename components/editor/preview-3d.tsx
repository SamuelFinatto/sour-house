"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useFloor } from "@/hooks/use-floor";
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

	const handleSaveRef = useCallback(() => handleSave(), [handleSave]);

	useEffect(() => {
		window.addEventListener("floor-save", handleSaveRef);
		return () => window.removeEventListener("floor-save", handleSaveRef);
	}, [handleSaveRef]);

	const objects = useMemo(() => {
		if (!floor) return [];
		return buildScene3D(floor.entities, floor.elevationCm);
	}, [floor]);

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

	return (
		<div className="relative flex-1 min-h-0">
			<div className="absolute inset-0">
				<Canvas camera={{ position: [5, 8, 10], fov: 50 }}>
					<Scene objects={objects} />
				</Canvas>
			</div>
		</div>
	);
}
