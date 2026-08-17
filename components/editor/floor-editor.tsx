"use client";

import { Layers } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Canvas } from "@/components/editor/canvas";
import { EntitiesPanel } from "@/components/editor/entities-panel";
import { FloorNav } from "@/components/editor/floor-nav";
import { HistoryPanel } from "@/components/editor/history-panel";
import { Inspector } from "@/components/editor/inspector";
import { LayersPanel } from "@/components/editor/layers-panel";
import { SymbolLibrary } from "@/components/editor/symbol-library";
import { Toolbar } from "@/components/editor/toolbar";
import { UnderlayPanel } from "@/components/editor/underlay-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEditor } from "@/hooks/use-editor";
import { useFloor } from "@/hooks/use-floor";
import { fitViewport } from "@/lib/geometry";
import type { Entity } from "@/types/entities";
import type { FloorUnderlay } from "@/types/floor";

interface FloorEditorProps {
	projectId: string;
	floorId: string;
}

export function FloorEditor({ projectId, floorId }: FloorEditorProps) {
	const { floor, isLoading, mutate } = useFloor(projectId, floorId);
	const editor = useEditor();
	const initializedRef = useRef(false);
	const canvasContainerRef = useRef<HTMLDivElement>(null);
	const [floorNavOpen, setFloorNavOpen] = useState(false);

	// Sync entities when floor data loads and fit viewport
	useEffect(() => {
		if (floor && !initializedRef.current) {
			initializedRef.current = true;
			editor.loadEntities(floor.entities);

			// Fit viewport to show all entities after a frame so the container is measured
			requestAnimationFrame(() => {
				const el = canvasContainerRef.current;
				if (el && floor.entities.length > 0) {
					const vp = fitViewport(
						floor.entities,
						el.clientWidth,
						el.clientHeight,
					);
					editor.setViewport(vp);
				}
			});
		}
	}, [floor, editor.loadEntities, editor.setViewport]);

	const handleUnderlayUpdate = useCallback(
		(underlay: FloorUnderlay | undefined) => {
			if (!floor) return;
			const updated = { ...floor, entities: editor.entities, underlay };
			fetch(`/api/projects/${projectId}/floors/${floorId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updated),
			}).then((res) => {
				if (res.ok) mutate();
				else toast.error("Failed to update underlay");
			});
		},
		[floor, projectId, floorId, editor.entities, mutate],
	);

	const handleSave = useCallback(async () => {
		if (!floor) return;
		try {
			const res = await fetch(`/api/projects/${projectId}/floors/${floorId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...floor, entities: editor.entities }),
			});
			if (!res.ok) throw new Error("Failed to save");
			mutate();
			toast.success("Floor saved");
		} catch {
			toast.error("Failed to save floor");
		}
	}, [floor, projectId, floorId, editor.entities, mutate]);

	const handleZoomChange = useCallback(
		(newZoom: number) => {
			const vp = editor.state.viewport;
			const el = canvasContainerRef.current;
			const cx = el ? el.clientWidth / 2 : 0;
			const cy = el ? el.clientHeight / 2 : 0;
			editor.setViewport({
				x: cx - (cx - vp.x) * (newZoom / vp.zoom),
				y: cy - (cy - vp.y) * (newZoom / vp.zoom),
				zoom: newZoom,
			});
		},
		[editor.state.viewport, editor.setViewport],
	);

	const handleFitView = useCallback(() => {
		const el = canvasContainerRef.current;
		if (el && editor.entities.length > 0) {
			editor.setViewport(
				fitViewport(editor.entities, el.clientWidth, el.clientHeight),
			);
		}
	}, [editor.entities, editor.setViewport]);

	const handleImportJson = useCallback(() => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				const data = JSON.parse(text);
				if (!Array.isArray(data.entities)) {
					toast.error("Invalid floor file: missing entities");
					return;
				}
				// Migrate the floor data to current schema version
				const res = await fetch("/api/migrate", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: text,
				});
				const migrated = res.ok ? await res.json() : data;
				editor.loadEntities(migrated.entities);
				toast.success(`Imported ${migrated.entities.length} entities`);
			} catch {
				toast.error("Failed to parse JSON file");
			}
		};
		input.click();
	}, [editor.loadEntities]);

	// Keep refs to avoid stale closures in keyboard handler
	const editorRef = useRef(editor);
	editorRef.current = editor;
	const handleSaveRef = useRef(handleSave);
	handleSaveRef.current = handleSave;
	const clipboardRef = useRef<Entity[]>([]);

	// Listen for save events from the layout header
	useEffect(() => {
		const onSave = () => handleSaveRef.current();
		window.addEventListener("floor-save", onSave);
		return () => window.removeEventListener("floor-save", onSave);
	}, []);

	// Keyboard shortcuts — stable effect, no deps that change every render
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const tag = (e.target as HTMLElement)?.tagName;
			const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
			const ed = editorRef.current;

			if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
				e.preventDefault();
				ed.redo();
			} else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				ed.undo();
			} else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				handleSaveRef.current();
			} else if (e.key === "c" && (e.metaKey || e.ctrlKey) && !inInput) {
				const selected = ed.entities.filter((ent) =>
					ed.state.selectedEntityIds.includes(ent.id),
				);
				if (selected.length > 0) {
					clipboardRef.current = selected;
				}
			} else if (e.key === "v" && (e.metaKey || e.ctrlKey) && !inInput) {
				if (clipboardRef.current.length > 0) {
					const offset = 20;
					const newIds: string[] = [];
					for (const ent of clipboardRef.current) {
						const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
						newIds.push(id);
						const clone = { ...ent, id } as Entity;
						if ("x" in clone && "y" in clone) {
							(clone as Entity & { x: number; y: number }).x += offset;
							(clone as Entity & { x: number; y: number }).y += offset;
						}
						if (clone.type === "wall") {
							clone.x1 += offset;
							clone.y1 += offset;
							clone.x2 += offset;
							clone.y2 += offset;
						}
						if (clone.type === "room") {
							clone.polygon = clone.polygon.map(([px, py]) => [
								px + offset,
								py + offset,
							]);
						}
						ed.addEntity(clone);
					}
					ed.selectEntity(newIds[0]);
				}
			} else if ((e.key === "Delete" || e.key === "Backspace") && !inInput) {
				for (const id of ed.state.selectedEntityIds) {
					ed.deleteEntity(id);
				}
			} else if (
				(e.key === "ArrowUp" ||
					e.key === "ArrowDown" ||
					e.key === "ArrowLeft" ||
					e.key === "ArrowRight") &&
				!inInput &&
				ed.state.selectedEntityIds.length > 0
			) {
				e.preventDefault();
				const step = e.shiftKey ? 10 : 1;
				const dx =
					e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
				const dy =
					e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
				for (const id of ed.state.selectedEntityIds) {
					const ent = ed.entities.find((en) => en.id === id);
					if (!ent) continue;
					if (ent.type === "wall") {
						ed.updateEntity(id, {
							x1: ent.x1 + dx,
							y1: ent.y1 + dy,
							x2: ent.x2 + dx,
							y2: ent.y2 + dy,
						} as Partial<Entity>);
					} else if (ent.type === "room") {
						ed.updateEntity(id, {
							polygon: ent.polygon.map(([px, py]) => [px + dx, py + dy]),
						} as Partial<Entity>);
					} else if ("x" in ent && "y" in ent) {
						ed.updateEntity(id, {
							x: (ent as Entity & { x: number }).x + dx,
							y: (ent as Entity & { y: number }).y + dy,
						} as Partial<Entity>);
					}
				}
			} else if (e.key === "Escape") {
				ed.setTool("select");
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-muted-foreground">Loading floor...</p>
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

	const selectedEntity =
		editor.state.selectedEntityIds.length === 1
			? (editor.entities.find(
					(e) => e.id === editor.state.selectedEntityIds[0],
				) ?? null)
			: null;

	const selectedEntities = editor.entities.filter((e) =>
		editor.state.selectedEntityIds.includes(e.id),
	);

	return (
		<>
			{/* Toolbar */}
			<Toolbar
				activeTool={editor.state.activeTool}
				gridEnabled={editor.state.gridEnabled}
				snapEnabled={editor.state.snapEnabled}
				zoom={editor.state.viewport.zoom}
				onSelectTool={editor.setTool}
				onToggleGrid={editor.toggleGrid}
				onToggleSnap={editor.toggleSnap}
				onZoomChange={handleZoomChange}
				onFitView={handleFitView}
				onUndo={editor.undo}
				onRedo={editor.redo}
			/>

			{/* Main area */}
			<div className="flex flex-1 min-h-0 min-w-0">
				{/* Floor nav panel */}
				<FloorNav
					projectId={projectId}
					currentFloorId={floorId}
					open={floorNavOpen}
					onClose={() => setFloorNavOpen(false)}
				/>

				{/* Canvas */}
				<div ref={canvasContainerRef} className="flex-1 flex min-w-0 relative">
					{!floorNavOpen && (
						<Button
							variant="outline"
							size="icon-sm"
							className="absolute top-2 left-2 z-10"
							onClick={() => setFloorNavOpen(true)}
							title="Show floors"
						>
							<Layers className="h-4 w-4" />
						</Button>
					)}
					<Canvas
						entities={editor.entities}
						viewport={editor.state.viewport}
						activeTool={editor.state.activeTool}
						visibleLayers={editor.state.visibleLayers}
						gridEnabled={editor.state.gridEnabled}
						snapEnabled={editor.state.snapEnabled}
						gridSize={floor.grid.size}
						selectedEntityIds={editor.state.selectedEntityIds}
						underlay={floor.underlay}
						underlayUrl={
							floor.underlay
								? `/api/projects/${projectId}/assets/${floor.underlay.assetId}`
								: undefined
						}
						onViewportChange={editor.setViewport}
						onAddEntity={editor.addEntity}
						onUpdateEntity={editor.updateEntity}
						onSelectEntity={editor.selectEntity}
					/>
				</div>

				{/* Right sidebar */}
				<div className="w-56 border-l bg-background overflow-y-auto hidden md:block">
					<Inspector
						entity={selectedEntity}
						units={floor.units}
						projectId={projectId}
						onUpdate={editor.updateEntity}
						onDelete={editor.deleteEntity}
					/>
					<Separator />
					<LayersPanel
						layers={editor.state.visibleLayers}
						onToggle={editor.toggleLayer}
						onShowAll={editor.showAllLayers}
						onHideAll={editor.hideAllLayers}
					/>
					<Separator />
					<EntitiesPanel
						entities={editor.entities}
						visibleLayers={editor.state.visibleLayers}
						selectedEntityIds={editor.state.selectedEntityIds}
						onSelect={editor.selectEntity}
						onMove={editor.moveEntity}
					/>
					<Separator />
					<SymbolLibrary
						selectedEntities={selectedEntities}
						onPlace={editor.addEntities}
					/>
					<Separator />
					<UnderlayPanel
						projectId={projectId}
						underlay={floor.underlay}
						onUpdate={handleUnderlayUpdate}
					/>
					<Separator />
					<HistoryPanel
						projectId={projectId}
						floorId={floorId}
						onRestore={(entities) => {
							editor.loadEntities(entities as Entity[]);
							mutate();
						}}
					/>
				</div>
			</div>
		</>
	);
}
