"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { ProjectCard } from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import { apiUrl } from "@/lib/api";

export function ProjectList() {
	const { projects, isLoading, mutate } = useProjects();
	const router = useRouter();

	async function handleImportProject() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				const data = JSON.parse(text);
				if (!data.project || !data.floors) {
					toast.error("Invalid project file");
					return;
				}
				const res = await fetch(apiUrl("/api/projects/import"), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: text,
				});
				if (!res.ok) {
					const err = await res.json().catch(() => null);
					toast.error(err?.error ?? "Failed to import project");
					return;
				}
				const { id } = await res.json();
				toast.success("Project imported");
				mutate();
				router.push(`/projects/${id}`);
			} catch {
				toast.error("Failed to parse project file");
			}
		};
		input.click();
	}

	async function handleCreate(project: {
		id: string;
		name: string;
		address?: string;
	}) {
		await fetch(apiUrl("/api/projects"), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(project),
		});
		mutate();
	}

	async function handleDelete(id: string) {
		await fetch(apiUrl(`/api/projects/${id}`), { method: "DELETE" });
		mutate();
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Projects</h1>
					<p className="text-sm text-muted-foreground">
						Manage your house plans
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleImportProject}>
						<Upload className="mr-2 h-3 w-3" />
						Import
					</Button>
					<CreateProjectDialog onCreate={handleCreate} />
				</div>
			</div>

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={`skeleton-${i}`} className="h-36 rounded-xl" />
					))}
				</div>
			) : projects.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
					<p className="text-muted-foreground mb-4">No projects yet</p>
					<CreateProjectDialog onCreate={handleCreate} />
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{projects.map((project) => (
						<ProjectCard
							key={project.id}
							project={project}
							onDelete={handleDelete}
						/>
					))}
				</div>
			)}
		</div>
	);
}
