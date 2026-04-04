"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectSummary } from "@/types/project";
import { Layers, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
	project: ProjectSummary;
	onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
	return (
		<Card className="group relative">
			<Link href={`/projects/${project.id}`} className="absolute inset-0 z-0" />
			<CardHeader className="flex flex-row items-start justify-between space-y-0">
				<div className="space-y-1">
					<CardTitle className="text-lg">{project.name}</CardTitle>
					{project.address && (
						<p className="text-sm text-muted-foreground flex items-center gap-1">
							<MapPin className="h-3 w-3" />
							{project.address}
						</p>
					)}
				</div>
				<Button
					variant="ghost"
					size="icon-sm"
					className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity"
					onClick={(e) => {
						e.preventDefault();
						onDelete(project.id);
					}}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="flex items-center gap-1">
						<Layers className="h-3 w-3" />
						{project.floorCount} {project.floorCount === 1 ? "floor" : "floors"}
					</Badge>
					<span className="text-xs text-muted-foreground">
						Updated {new Date(project.updatedAt).toLocaleDateString()}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
