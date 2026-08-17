"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import * as THREE from "three";
import { useFloor } from "@/hooks/use-floor";
import type { Box3D, Object3D, Plane3D } from "@/lib/three-builder";
import { buildScene3D, getSceneBBox } from "@/lib/three-builder";

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

function AutoFitCamera({
	centerX,
	centerY,
	centerZ,
	size,
}: {
	centerX: number;
	centerY: number;
	centerZ: number;
	size: number;
}) {
	const { camera } = useThree();

	useEffect(() => {
		const dist = size * 1.5;
		camera.position.set(
			centerX + dist * 0.6,
			centerY + dist * 0.8,
			centerZ + dist * 0.6,
		);
		camera.lookAt(centerX, centerY, centerZ);
		camera.updateProjectionMatrix();
	}, [camera, centerX, centerY, centerZ, size]);

	return null;
}

function KeyboardMovement() {
	const { camera } = useThree();
	const keys = useRef(new Set<string>());
	const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null);

	useEffect(() => {
		// Find the OrbitControls instance via the camera's parent scene
		const ctrl = (
			camera as unknown as {
				userData?: { controls?: { target: THREE.Vector3 } };
			}
		)?.userData?.controls;
		if (ctrl) controlsRef.current = ctrl;
	}, [camera]);

	useEffect(() => {
		const onDown = (e: KeyboardEvent) => {
			if (
				[
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"w",
					"a",
					"s",
					"d",
				].includes(e.key)
			) {
				e.preventDefault();
				keys.current.add(e.key);
			}
		};
		const onUp = (e: KeyboardEvent) => keys.current.delete(e.key);
		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
		};
	}, []);

	useFrame((_, delta) => {
		if (keys.current.size === 0) return;
		const speed = 5 * delta;

		// Get camera's forward direction projected onto XZ plane
		const forward = new THREE.Vector3();
		camera.getWorldDirection(forward);
		forward.y = 0;
		forward.normalize();

		const right = new THREE.Vector3();
		right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

		const move = new THREE.Vector3();
		if (keys.current.has("ArrowUp") || keys.current.has("w")) move.add(forward);
		if (keys.current.has("ArrowDown") || keys.current.has("s"))
			move.sub(forward);
		if (keys.current.has("ArrowRight") || keys.current.has("d"))
			move.add(right);
		if (keys.current.has("ArrowLeft") || keys.current.has("a")) move.sub(right);

		if (move.lengthSq() > 0) {
			move.normalize().multiplyScalar(speed);
			camera.position.add(move);
			// Also move OrbitControls target so rotation center follows
			const ctrl = controlsRef.current;
			if (ctrl) {
				ctrl.target.add(move);
			}
		}
	});

	return null;
}

function Scene({
	objects,
	bbox,
}: {
	objects: Object3D[];
	bbox: ReturnType<typeof getSceneBBox>;
}) {
	const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null);
	const { camera } = useThree();

	// Store controls ref on camera so KeyboardMovement can find it
	useEffect(() => {
		if (controlsRef.current) {
			(
				camera as unknown as { userData: Record<string, unknown> }
			).userData.controls = controlsRef.current;
		}
	}, [camera]);

	return (
		<>
			<ambientLight intensity={0.6} />
			<directionalLight position={[10, 20, 10]} intensity={0.8} />
			<AutoFitCamera {...bbox} />
			<OrbitControls
				ref={controlsRef as React.Ref<never>}
				makeDefault
				keyEvents={false}
				target={[bbox.centerX, bbox.centerY, bbox.centerZ]}
			/>
			<KeyboardMovement />
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
			const res = await fetch(`/api/projects/${projectId}/floors/${floorId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(floor),
			});
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

	const bbox = useMemo(() => getSceneBBox(objects), [objects]);

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
				<Canvas camera={{ fov: 50 }}>
					<Scene objects={objects} bbox={bbox} />
				</Canvas>
			</div>
		</div>
	);
}
