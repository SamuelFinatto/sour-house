"use client";

import { ChevronLeft, Layers } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/api";

interface FloorNavProps {
	projectId: string;
	currentFloorId: string;
	open: boolean;
	onClose: () => void;
}

export function FloorNav({
	projectId,
	currentFloorId,
	open,
	onClose,
}: FloorNavProps) {
	const { data: floors } = useSWR<{ id: string; name: string }[]>(
		`/api/projects/${projectId}/floors`,
		fetcher,
	);

	if (!open) return null;

	return (
		<div className="w-48 border-r bg-background flex flex-col shrink-0">
			<div className="flex items-center justify-between px-3 py-2 border-b">
				<div className="flex items-center gap-1.5 text-sm font-medium">
					<Layers className="h-3.5 w-3.5" />
					Floors
				</div>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClose}
					title="Close panel"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
			</div>
			<nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
				{floors?.map((floor, i) => (
					<Link
						key={floor.id}
						href={`/projects/${projectId}/floors/${floor.id}`}
						className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
							floor.id === currentFloorId
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground"
						}`}
					>
						<span className="text-xs font-mono opacity-60">L{i}</span>
						<span className="truncate">{floor.name}</span>
					</Link>
				))}
			</nav>
		</div>
	);
}
