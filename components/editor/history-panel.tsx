"use client";

import { Clock, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useFloorHistory } from "@/hooks/use-floor-history";
import { apiUrl } from "@/lib/api";

interface HistoryPanelProps {
	projectId: string;
	floorId: string;
	onRestore: (entities: unknown[]) => void;
}

function timeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function HistoryPanel({
	projectId,
	floorId,
	onRestore,
}: HistoryPanelProps) {
	const { versions, isLoading, mutate } = useFloorHistory(projectId, floorId);
	const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

	async function handleRestore(version: string) {
		const res = await fetch(
			apiUrl(`/api/projects/${projectId}/floors/${floorId}/history/${version}`),
			{ method: "POST" },
		);
		if (!res.ok) {
			toast.error("Failed to restore version");
			return;
		}
		const floor = await res.json();
		onRestore(floor.entities);
		mutate();
		toast.success("Version restored");
	}

	return (
		<div className="p-3 space-y-1">
			<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
				<Clock className="h-3 w-3" />
				History ({versions.length})
			</h3>
			{isLoading ? (
				<p className="text-xs text-muted-foreground">Loading...</p>
			) : versions.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					No history yet. Save to create a version.
				</p>
			) : (
				<div className="space-y-0.5 max-h-60 overflow-y-auto">
					{versions.map((v) => (
						<div
							key={v.version}
							className="flex items-center justify-between gap-1"
						>
							<span
								className="text-xs text-muted-foreground truncate"
								title={new Date(v.timestamp).toLocaleString()}
							>
								{timeAgo(v.timestamp)}
							</span>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setRestoringVersion(v.version)}
								title="Restore this version"
							>
								<RotateCcw className="h-3 w-3" />
							</Button>
						</div>
					))}
				</div>
			)}
			<ConfirmDialog
				title="Restore version"
				description="Are you sure? This will replace the current floor with this saved version."
				confirmLabel="Restore"
				open={restoringVersion !== null}
				onOpenChange={(open) => {
					if (!open) setRestoringVersion(null);
				}}
				onConfirm={() => {
					if (restoringVersion) return handleRestore(restoringVersion);
				}}
			/>
		</div>
	);
}
