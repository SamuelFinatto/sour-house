import { Suspense } from "react";
import { ProjectList } from "@/components/project/project-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
	return (
		<main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
			<Suspense
				fallback={
					<div className="space-y-6">
						<Skeleton className="h-10 w-48" />
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={`skeleton-${i}`} className="h-36 rounded-xl" />
							))}
						</div>
					</div>
				}
			>
				<ProjectList />
			</Suspense>
		</main>
	);
}
