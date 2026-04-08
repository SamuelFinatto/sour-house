"use client";

import {
	ArrowLeft,
	ArrowRightLeft,
	Check,
	Copy,
	Download,
	Layers,
	MapPin,
	Pencil,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { CreateFloorDialog } from "@/components/floor/create-floor-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-project";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FloorListProps {
	projectId: string;
}

export function FloorList({ projectId }: FloorListProps) {
	const { project, isLoading, mutate } = useProject(projectId);
	const { data: floors, mutate: mutateFloors } = useSWR<
		{ id: string; name: string }[]
	>(`/api/projects/${projectId}/floors`, fetcher);
	const router = useRouter();
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [deletingFloorId, setDeletingFloorId] = useState<string | null>(null);
	const [movingFloorId, setMovingFloorId] = useState<string | null>(null);
	const { data: allProjects } = useSWR<{ id: string; name: string }[]>(
		movingFloorId ? "/api/projects" : null,
		fetcher,
	);
	const [selectedTargetProject, setSelectedTargetProject] = useState<
		string | null
	>(null);

	async function handleCreateFloor(floor: {
		id: string;
		name: string;
		elevationCm: number;
	}) {
		await fetch(`/api/projects/${projectId}/floors`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(floor),
		});
		mutate();
		mutateFloors();
	}

	async function handleDeleteFloor(floorId: string) {
		await fetch(`/api/projects/${projectId}/floors/${floorId}`, {
			method: "DELETE",
		});
		mutate();
		mutateFloors();
	}

	const [renamingFloorId, setRenamingFloorId] = useState<string | null>(null);
	const [floorRenameValue, setFloorRenameValue] = useState("");

	async function handleRenameFloor(floorId: string) {
		const name = floorRenameValue.trim();
		if (!name) return;
		const newId = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		if (!newId) return;
		const res = await fetch(`/api/projects/${projectId}/floors/${floorId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, newId }),
		});
		if (!res.ok) {
			toast.error("Failed to rename floor");
			return;
		}
		setRenamingFloorId(null);
		mutate();
		mutateFloors();
	}

	async function handleMoveFloor() {
		if (!movingFloorId || !selectedTargetProject) return;
		const res = await fetch(
			`/api/projects/${projectId}/floors/${movingFloorId}/move`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ targetProjectId: selectedTargetProject }),
			},
		);
		if (!res.ok) {
			toast.error("Failed to move floor");
			return;
		}
		setMovingFloorId(null);
		setSelectedTargetProject(null);
		mutate();
		mutateFloors();
		toast.success("Floor moved");
	}

	async function handleDuplicateFloor(floorId: string) {
		const res = await fetch(
			`/api/projects/${projectId}/floors/${floorId}/duplicate`,
			{ method: "POST" },
		);
		if (!res.ok) {
			toast.error("Failed to duplicate floor");
			return;
		}
		mutate();
		mutateFloors();
		toast.success("Floor duplicated");
	}

	async function handleRename() {
		const name = renameValue.trim();
		if (!name) return;
		const newId = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		if (!newId) return;

		const res = await fetch(`/api/projects/${projectId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, newId }),
		});
		if (!res.ok) {
			toast.error("Failed to rename project");
			return;
		}
		setIsRenaming(false);
		if (newId !== projectId) {
			router.push(`/projects/${newId}`);
		} else {
			mutate();
		}
	}

	async function handleExportProject() {
		const res = await fetch(`/api/projects/${projectId}/export`);
		if (!res.ok) {
			toast.error("Failed to export project");
			return;
		}
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${project?.name ?? projectId}.json`;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
	}

	function handleImportFloor() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				const data = JSON.parse(text);
				if (!data.id || !data.name || !Array.isArray(data.entities)) {
					toast.error("Invalid floor file");
					return;
				}
				const res = await fetch(`/api/projects/${projectId}/floors`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: text,
				});
				if (!res.ok) {
					toast.error("Failed to import floor");
					return;
				}
				mutate();
				mutateFloors();
				toast.success(`Imported floor "${data.name}"`);
			} catch {
				toast.error("Failed to parse floor file");
			}
		};
		input.click();
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-64" />
				<div className="space-y-3">
					{Array.from({ length: 2 }).map((_, i) => (
						<Skeleton key={`skeleton-${i}`} className="h-20 rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	if (!project) {
		return <p className="text-muted-foreground">Project not found</p>;
	}

	return (
		<div className="space-y-6">
			<div>
				<Link
					href="/"
					className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
				>
					<ArrowLeft className="h-3 w-3" />
					Back to projects
				</Link>
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						{isRenaming ? (
							<form
								className="flex items-center gap-2"
								onSubmit={(e) => {
									e.preventDefault();
									handleRename();
								}}
							>
								<input
									value={renameValue}
									onChange={(e) => setRenameValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Escape") setIsRenaming(false);
									}}
									className="h-9 text-xl font-semibold w-64 rounded-lg border border-input bg-transparent px-2.5 py-1 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
									autoFocus
								/>
								<Button variant="ghost" size="icon-sm" type="submit">
									<Check className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									type="button"
									onClick={() => setIsRenaming(false)}
								>
									<X className="h-4 w-4" />
								</Button>
							</form>
						) : (
							<div className="flex items-center gap-2 group">
								<h1 className="text-2xl font-semibold">{project.name}</h1>
								<Button
									variant="ghost"
									size="icon-sm"
									className="opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={() => {
										setRenameValue(project.name);
										setIsRenaming(true);
									}}
								>
									<Pencil className="h-3 w-3" />
								</Button>
							</div>
						)}
						{project.address && (
							<p className="text-sm text-muted-foreground flex items-center gap-1">
								<MapPin className="h-3 w-3" />
								{project.address}
							</p>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={handleImportFloor}>
							<Upload className="mr-2 h-3 w-3" />
							Import Floor
						</Button>
						<Button variant="outline" size="sm" onClick={handleExportProject}>
							<Download className="mr-2 h-3 w-3" />
							Export
						</Button>
						<CreateFloorDialog onCreate={handleCreateFloor} />
					</div>
				</div>
			</div>

			{project.floorOrder.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
					<Layers className="h-8 w-8 text-muted-foreground mb-2" />
					<p className="text-muted-foreground mb-4">No floors yet</p>
					<CreateFloorDialog onCreate={handleCreateFloor} />
				</div>
			) : (
				<div className="space-y-3">
					{project.floorOrder.map((floorId, index) => {
						const floorName =
							floors?.find((f) => f.id === floorId)?.name ?? floorId;
						return (
							<div
								key={floorId}
								className="flex items-center rounded-xl border bg-card text-card-foreground ring-1 ring-foreground/10"
							>
								{renamingFloorId === floorId ? (
									<form
										className="flex flex-1 items-center gap-2 px-4 py-3"
										onSubmit={(e) => {
											e.preventDefault();
											handleRenameFloor(floorId);
										}}
									>
										<Badge variant="outline" className="tabular-nums">
											L{index}
										</Badge>
										<input
											value={floorRenameValue}
											onChange={(e) => setFloorRenameValue(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Escape") setRenamingFloorId(null);
											}}
											className="h-7 text-sm flex-1 rounded-lg border border-input bg-transparent px-2.5 py-1 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
											autoFocus
										/>
										<Button variant="ghost" size="icon-sm" type="submit">
											<Check className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											type="button"
											onClick={() => setRenamingFloorId(null)}
										>
											<X className="h-4 w-4" />
										</Button>
									</form>
								) : (
									<Link
										href={`/projects/${projectId}/floors/${floorId}`}
										className="flex flex-1 items-center gap-3 px-4 py-4 min-w-0 hover:bg-muted/50 rounded-l-xl transition-colors"
									>
										<Badge variant="outline" className="tabular-nums">
											L{index}
										</Badge>
										<span className="text-base font-medium">{floorName}</span>
									</Link>
								)}
								{renamingFloorId !== floorId && (
									<div className="flex items-center gap-1 px-2">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => {
												setFloorRenameValue(floorName);
												setRenamingFloorId(floorId);
											}}
											title="Rename floor"
										>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => handleDuplicateFloor(floorId)}
											title="Duplicate floor"
										>
											<Copy className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => {
												setMovingFloorId(floorId);
												setSelectedTargetProject(null);
											}}
											title="Move to another project"
										>
											<ArrowRightLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setDeletingFloorId(floorId)}
											title="Delete floor"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
			<ConfirmDialog
				title="Delete floor"
				description="Are you sure you want to delete this floor? This action cannot be undone."
				open={deletingFloorId !== null}
				onOpenChange={(open) => {
					if (!open) setDeletingFloorId(null);
				}}
				onConfirm={() => {
					if (deletingFloorId) return handleDeleteFloor(deletingFloorId);
				}}
			/>

			{/* Move floor dialog */}
			<Dialog
				open={movingFloorId !== null}
				onOpenChange={(open) => {
					if (!open) setMovingFloorId(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Move floor to another project</DialogTitle>
					</DialogHeader>
					<div className="space-y-1">
						{allProjects
							?.filter((p) => p.id !== projectId)
							.map((p) => (
								<button
									key={p.id}
									type="button"
									className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
										selectedTargetProject === p.id
											? "bg-primary text-primary-foreground"
											: "hover:bg-muted"
									}`}
									onClick={() => setSelectedTargetProject(p.id)}
								>
									{p.name}
								</button>
							))}
						{allProjects?.filter((p) => p.id !== projectId).length === 0 && (
							<p className="text-sm text-muted-foreground py-4 text-center">
								No other projects available
							</p>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setMovingFloorId(null)}>
							Cancel
						</Button>
						<Button onClick={handleMoveFloor} disabled={!selectedTargetProject}>
							Move
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
