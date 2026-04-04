"use client";

import { ArrowLeft, Box, Pencil } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { use } from "react";
import { useFloor } from "@/hooks/use-floor";

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
				<div className="flex-1" />
				<div id="floor-header-actions" />
			</div>
			{children}
		</div>
	);
}
