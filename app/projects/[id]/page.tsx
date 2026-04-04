import { FloorList } from "@/components/floor/floor-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export default async function ProjectPage(
	props: PageProps<"/projects/[id]">,
) {
	const { id } = await props.params;

	return (
		<main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
			<Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
				<FloorList projectId={id} />
			</Suspense>
		</main>
	);
}
