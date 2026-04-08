import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { ProjectList } from "@/components/project/project-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
	return (
		<main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
			<div className="flex items-center gap-3 mb-8">
				<Logo className="h-9 w-9 text-primary" />
				<div>
					<h1 className="text-xl font-semibold tracking-tight">Sour House</h1>
					<p className="text-sm text-muted-foreground">House planning tool</p>
				</div>
			</div>
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
