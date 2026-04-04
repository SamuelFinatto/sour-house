"use client";

import { useCallback, useRef, useState } from "react";
import type { EditorState, HistoryEntry, Tool, Viewport } from "@/types/editor";
import type { Entity } from "@/types/entities";
import type { LayerName, LayerVisibility } from "@/types/floor";

const MAX_HISTORY = 50;

const defaultLayers: LayerVisibility = {
	structure: true,
	furniture: true,
	electrical: true,
	plumbing: true,
	notes: true,
};

export function useEditor(initialEntities: Entity[] = []) {
	const [entities, setEntities] = useState<Entity[]>(initialEntities);
	const [state, setState] = useState<EditorState>({
		activeTool: "select",
		selectedEntityIds: [],
		viewport: { x: 0, y: 0, zoom: 1 },
		visibleLayers: { ...defaultLayers },
		gridEnabled: true,
		snapEnabled: true,
	});

	const historyRef = useRef<HistoryEntry[]>([
		{ entities: initialEntities, timestamp: Date.now() },
	]);
	const historyIndexRef = useRef(0);

	const pushHistory = useCallback((newEntities: Entity[]) => {
		const idx = historyIndexRef.current;
		const history = historyRef.current.slice(0, idx + 1);
		history.push({ entities: newEntities, timestamp: Date.now() });
		if (history.length > MAX_HISTORY) history.shift();
		historyRef.current = history;
		historyIndexRef.current = history.length - 1;
	}, []);

	const updateEntities = useCallback(
		(newEntities: Entity[]) => {
			setEntities(newEntities);
			pushHistory(newEntities);
		},
		[pushHistory],
	);

	const undo = useCallback(() => {
		const idx = historyIndexRef.current;
		if (idx > 0) {
			historyIndexRef.current = idx - 1;
			setEntities(historyRef.current[idx - 1].entities);
		}
	}, []);

	const redo = useCallback(() => {
		const idx = historyIndexRef.current;
		if (idx < historyRef.current.length - 1) {
			historyIndexRef.current = idx + 1;
			setEntities(historyRef.current[idx + 1].entities);
		}
	}, []);

	const loadEntities = useCallback((newEntities: Entity[]) => {
		setEntities(newEntities);
		historyRef.current = [{ entities: newEntities, timestamp: Date.now() }];
		historyIndexRef.current = 0;
	}, []);

	const setTool = useCallback((tool: Tool) => {
		setState((s) => ({ ...s, activeTool: tool, selectedEntityIds: [] }));
	}, []);

	const setViewport = useCallback((viewport: Viewport) => {
		setState((s) => ({ ...s, viewport }));
	}, []);

	const toggleLayer = useCallback((layer: LayerName) => {
		setState((s) => ({
			...s,
			visibleLayers: {
				...s.visibleLayers,
				[layer]: !s.visibleLayers[layer],
			},
		}));
	}, []);

	const showAllLayers = useCallback(() => {
		setState((s) => ({
			...s,
			visibleLayers: {
				structure: true,
				furniture: true,
				electrical: true,
				plumbing: true,
				notes: true,
			},
		}));
	}, []);

	const hideAllLayers = useCallback(() => {
		setState((s) => ({
			...s,
			visibleLayers: {
				structure: false,
				furniture: false,
				electrical: false,
				plumbing: false,
				notes: false,
			},
		}));
	}, []);

	const selectEntity = useCallback((id: string | null) => {
		setState((s) => ({
			...s,
			selectedEntityIds: id ? [id] : [],
		}));
	}, []);

	const addEntity = useCallback(
		(entity: Entity) => {
			const newEntities = [...entities, entity];
			updateEntities(newEntities);
		},
		[entities, updateEntities],
	);

	const updateEntity = useCallback(
		(id: string, updates: Partial<Entity>) => {
			const newEntities = entities.map((e) =>
				e.id === id ? { ...e, ...updates } : e,
			);
			updateEntities(newEntities as Entity[]);
		},
		[entities, updateEntities],
	);

	const deleteEntity = useCallback(
		(id: string) => {
			const newEntities = entities.filter((e) => e.id !== id);
			updateEntities(newEntities);
			setState((s) => ({
				...s,
				selectedEntityIds: s.selectedEntityIds.filter((eid) => eid !== id),
			}));
		},
		[entities, updateEntities],
	);

	const toggleGrid = useCallback(() => {
		setState((s) => ({ ...s, gridEnabled: !s.gridEnabled }));
	}, []);

	const toggleSnap = useCallback(() => {
		setState((s) => ({ ...s, snapEnabled: !s.snapEnabled }));
	}, []);

	return {
		entities,
		state,
		loadEntities,
		setTool,
		setViewport,
		toggleLayer,
		showAllLayers,
		hideAllLayers,
		selectEntity,
		addEntity,
		updateEntity,
		deleteEntity,
		toggleGrid,
		toggleSnap,
		undo,
		redo,
	};
}
