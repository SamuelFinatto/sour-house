"use client";

import { ArrowLeft, Download, Save } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Canvas } from "@/components/editor/canvas";
import { EntitiesPanel } from "@/components/editor/entities-panel";
import { Inspector } from "@/components/editor/inspector";
import { LayersPanel } from "@/components/editor/layers-panel";
import { Toolbar } from "@/components/editor/toolbar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useEditor } from "@/hooks/use-editor";
import { useFloor } from "@/hooks/use-floor";
import { downloadPng, downloadSvg } from "@/lib/export";
import { fitViewport } from "@/lib/geometry";

interface FloorEditorProps {
	projectId: string;
	floorId: string;
}

export function FloorEditor({ projectId, floorId }: FloorEditorProps) {
	const { floor, isLoading, mutate } = useFloor(projectId, floorId);
	const editor = useEditor();
	const initializedRef = useRef(false);
	const canvasContainerRef = useRef<HTMLDivElement>(null);

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
			// Zoom toward center of the canvas container
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

	const handleExportSvg = useCallback(() => {
		downloadSvg(
			editor.entities,
			editor.state.visibleLayers,
			`${floor?.name ?? "floor"}.svg`,
		);
	}, [editor.entities, editor.state.visibleLayers, floor?.name]);

	const handleExportPng = useCallback(async () => {
		try {
			await downloadPng(
				editor.entities,
				editor.state.visibleLayers,
				`${floor?.name ?? "floor"}.png`,
			);
		} catch {
			toast.error("Failed to export PNG");
		}
	}, [editor.entities, editor.state.visibleLayers, floor?.name]);

	const handleExportJson = useCallback(() => {
		if (!floor) return;
		const data = { ...floor, entities: editor.entities };
		const blob = new Blob([JSON.stringify(data, null, 2)], {
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
	}, [floor, editor.entities]);

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
				editor.loadEntities(data.entities);
				toast.success(`Imported ${data.entities.length} entities`);
			} catch {
				toast.error("Failed to parse JSON file");
			}
		};
		input.click();
	}, [editor.loadEntities]);

	// Keyboard shortcuts
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
				e.preventDefault();
				editor.redo();
			} else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				editor.undo();
			} else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				handleSave();
			} else if (e.key === "Delete" || e.key === "Backspace") {
				const tag = (e.target as HTMLElement)?.tagName;
				if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
				for (const id of editor.state.selectedEntityIds) {
					editor.deleteEntity(id);
				}
			} else if (e.key === "Escape") {
				editor.setTool("select");
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [editor, handleSave]);

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

	return (
		<div className="flex flex-col flex-1 h-full">
			{/* Header */}
			<div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
				<Link
					href={`/projects/${projectId}`}
					className="text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<span className="text-sm font-medium">{floor.name}</span>
				<span className="text-xs text-muted-foreground">
					({editor.entities.length} entities)
				</span>
				<div className="flex-1" />
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
						<DropdownMenuItem onClick={handleImportJson}>
							Import JSON
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Button variant="outline" size="sm" onClick={handleSave}>
					<Save className="mr-2 h-3 w-3" />
					Save
				</Button>
			</div>

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
			<div className="flex flex-1 min-h-0">
				{/* Canvas */}
				<div ref={canvasContainerRef} className="flex-1 flex min-w-0">
					<Canvas
						entities={editor.entities}
						viewport={editor.state.viewport}
						activeTool={editor.state.activeTool}
						visibleLayers={editor.state.visibleLayers}
						gridEnabled={editor.state.gridEnabled}
						snapEnabled={editor.state.snapEnabled}
						gridSize={floor.grid.size}
						selectedEntityIds={editor.state.selectedEntityIds}
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
					/>
				</div>
			</div>
		</div>
	);
}
