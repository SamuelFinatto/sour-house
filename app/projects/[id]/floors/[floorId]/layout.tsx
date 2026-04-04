"use client";

import { ArrowLeft, Box, Download, Pencil, Printer, Save } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFloor } from "@/hooks/use-floor";
import { downloadPng, downloadSvg, printFloorPlan } from "@/lib/export";

const ALL_LAYERS = {
	structure: true,
	furniture: true,
	electrical: true,
	plumbing: true,
	notes: true,
} as const;

export default function FloorLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ id: string; floorId: string }>;
}) {
	const { id: projectId, floorId } = use(params);
	const pathname = usePathname();
	const { floor } = useFloor(projectId, floorId);
	const is3D = pathname.endsWith("/3d");

	const handleExportSvg = useCallback(() => {
		if (!floor) return;
		downloadSvg(floor.entities, ALL_LAYERS, `${floor.name}.svg`);
	}, [floor]);

	const handleExportPng = useCallback(async () => {
		if (!floor) return;
		try {
			await downloadPng(floor.entities, ALL_LAYERS, `${floor.name}.png`);
		} catch {
			toast.error("Failed to export PNG");
		}
	}, [floor]);

	const handleExportJson = useCallback(() => {
		if (!floor) return;
		const blob = new Blob([JSON.stringify(floor, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${floor.name}.json`;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
	}, [floor]);

	const handlePrint = useCallback(() => {
		if (!floor) return;
		printFloorPlan(floor.entities, ALL_LAYERS, floor.name);
	}, [floor]);

	const handleSave = useCallback(() => {
		window.dispatchEvent(new CustomEvent("floor-save"));
	}, []);

	return (
		<div className="flex flex-col flex-1 h-full">
			<div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
				<Link
					href={`/projects/${projectId}`}
					className="text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<span className="text-sm font-medium">
					{floor?.name ?? "Loading..."}
				</span>
				<div className="flex items-center border rounded-lg overflow-hidden">
					<Link
						href={`/projects/${projectId}/floors/${floorId}`}
						className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
							!is3D
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Pencil className="h-3 w-3" />
						2D
					</Link>
					<Link
						href={`/projects/${projectId}/floors/${floorId}/3d`}
						className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
							is3D
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Box className="h-3 w-3" />
						3D
					</Link>
				</div>
				<span className="text-xs text-muted-foreground">
					({floor?.entities.length ?? 0} entities)
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
					</DropdownMenuContent>
				</DropdownMenu>
				<Button variant="outline" size="sm" onClick={handlePrint}>
					<Printer className="mr-2 h-3 w-3" />
					Print
				</Button>
				<Button variant="outline" size="sm" onClick={handleSave}>
					<Save className="mr-2 h-3 w-3" />
					Save
				</Button>
			</div>
			{children}
		</div>
	);
}
