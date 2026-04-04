"use client";

import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { ProjectCard } from "@/components/project/project-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";

export function ProjectList() {
	const { projects, isLoading, mutate } = useProjects();

	async function handleCreate(project: {
		id: string;
		name: string;
		address?: string;
	}) {
		await fetch("/api/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(project),
		});
		mutate();
	}

	async function handleDelete(id: string) {
		await fetch(`/api/projects/${id}`, { method: "DELETE" });
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
				<CreateProjectDialog onCreate={handleCreate} />
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
