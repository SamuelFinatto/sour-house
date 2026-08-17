"use client";

import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSymbols } from "@/hooks/use-symbols";
import type { Entity } from "@/types/entities";
import type { FloorSymbol } from "@/types/symbol";

interface SymbolLibraryProps {
	selectedEntities: Entity[];
	onPlace: (entities: Entity[]) => void;
}

function generateId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function placeSymbol(
	symbol: FloorSymbol,
	offsetX: number,
	offsetY: number,
): Entity[] {
	return symbol.entities.map((e) => {
		const id = generateId();
		if (e.type === "wall") {
			return {
				...e,
				id,
				x1: e.x1 + offsetX,
				y1: e.y1 + offsetY,
				x2: e.x2 + offsetX,
				y2: e.y2 + offsetY,
			};
		}
		if (e.type === "room") {
			return {
				...e,
				id,
				polygon: e.polygon.map(
					([px, py]) => [px + offsetX, py + offsetY] as [number, number],
				),
			};
		}
		if ("x" in e && "y" in e) {
			return {
				...e,
				id,
				x: (e as Entity & { x: number }).x + offsetX,
				y: (e as Entity & { y: number }).y + offsetY,
			};
		}
		return { ...(e as Record<string, unknown>), id } as unknown as Entity;
	}) as Entity[];
}

export function SymbolLibrary({
	selectedEntities,
	onPlace,
}: SymbolLibraryProps) {
	const { symbols, mutate } = useSymbols();
	const [saveName, setSaveName] = useState("");
	const [saving, setSaving] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!saveName.trim() || selectedEntities.length === 0) return;
		setSaving(true);
		try {
			const res = await fetch("/api/symbols", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: saveName.trim(),
					entities: selectedEntities,
				}),
			});
			if (!res.ok) {
				const err = await res.json();
				toast.error(err.error || "Failed to save symbol");
				return;
			}
			toast.success("Symbol saved");
			setSaveName("");
			mutate();
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!deleteId) return;
		await fetch(`/api/symbols/${deleteId}`, { method: "DELETE" });
		mutate();
		setDeleteId(null);
		toast.success("Symbol deleted");
	}

	function handlePlace(symbol: FloorSymbol) {
		const entities = placeSymbol(symbol, 100, 100);
		onPlace(entities);
		toast.success(`Placed "${symbol.name}"`);
	}

	return (
		<div className="p-3 space-y-2">
			<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
				<BookOpen className="h-3 w-3" />
				Symbols
			</h3>

			{selectedEntities.length > 0 && (
				<form onSubmit={handleSave} className="flex gap-1">
					<input
						type="text"
						value={saveName}
						onChange={(e) => setSaveName(e.target.value)}
						placeholder="Symbol name..."
						className="flex-1 h-7 text-xs rounded-lg border border-input bg-transparent px-2 outline-none focus-visible:border-ring"
					/>
					<Button
						type="submit"
						variant="outline"
						size="icon-sm"
						disabled={saving || !saveName.trim()}
						title="Save selection as symbol"
					>
						<Plus className="h-3 w-3" />
					</Button>
				</form>
			)}

			{symbols.length === 0 ? (
				<p className="text-[10px] text-muted-foreground">
					{selectedEntities.length > 0
						? "Name and save your selection above"
						: "Select entities to save as a symbol"}
				</p>
			) : (
				<div className="space-y-1">
					{symbols.map((sym) => (
						<div key={sym.id} className="flex items-center gap-1 group">
							<Button
								variant="ghost"
								size="sm"
								className="flex-1 justify-start text-xs h-7 px-2"
								onClick={() => handlePlace(sym)}
								title={`Place "${sym.name}" (${sym.entities.length} entities)`}
							>
								<span className="truncate">{sym.name}</span>
								<span className="text-[10px] text-muted-foreground ml-auto">
									{sym.entities.length}
								</span>
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								className="opacity-0 group-hover:opacity-100 shrink-0"
								onClick={() => setDeleteId(sym.id)}
								title="Delete symbol"
							>
								<Trash2 className="h-3 w-3" />
							</Button>
						</div>
					))}
				</div>
			)}

			<ConfirmDialog
				title="Delete symbol"
				description={`Are you sure you want to delete this symbol? This cannot be undone.`}
				confirmLabel="Delete"
				open={deleteId !== null}
				onOpenChange={(open) => !open && setDeleteId(null)}
				onConfirm={handleDelete}
			/>
		</div>
	);
}
