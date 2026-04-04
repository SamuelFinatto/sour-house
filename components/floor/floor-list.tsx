"use client";

import {
	ArrowLeft,
	Check,
	Download,
	Layers,
	MapPin,
	Pencil,
	Trash2,
	X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CreateFloorDialog } from "@/components/floor/create-floor-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-project";

interface FloorListProps {
	projectId: string;
}

export function FloorList({ projectId }: FloorListProps) {
	const { project, isLoading, mutate } = useProject(projectId);
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState("");

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
	}

	async function handleDeleteFloor(floorId: string) {
		await fetch(`/api/projects/${projectId}/floors/${floorId}`, {
			method: "DELETE",
		});
		mutate();
	}

	async function handleRename() {
		if (!renameValue.trim()) return;
		await fetch(`/api/projects/${projectId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: renameValue.trim() }),
		});
		setIsRenaming(false);
		mutate();
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
							<div className="flex items-center gap-2">
								<Input
									value={renameValue}
									onChange={(e) => setRenameValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleRename();
										if (e.key === "Escape") setIsRenaming(false);
									}}
									className="h-9 text-xl font-semibold w-64"
									autoFocus
								/>
								<Button variant="ghost" size="icon-sm" onClick={handleRename}>
									<Check className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => setIsRenaming(false)}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
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
					{project.floorOrder.map((floorId, index) => (
						<Card key={floorId} className="group relative">
							<Link
								href={`/projects/${projectId}/floors/${floorId}`}
								className="absolute inset-0 z-0"
							/>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
								<div className="flex items-center gap-3">
									<Badge variant="outline" className="tabular-nums">
										L{index}
									</Badge>
									<CardTitle className="text-base">{floorId}</CardTitle>
								</div>
								<div className="relative z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<Button
										variant="ghost"
										size="icon-sm"
										render={
											<Link href={`/projects/${projectId}/floors/${floorId}`} />
										}
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={(e) => {
											e.preventDefault();
											handleDeleteFloor(floorId);
										}}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</CardHeader>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
