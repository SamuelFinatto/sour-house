import type { Project } from "@/types/project";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useProject(projectId: string | null) {
	const { data, error, isLoading, mutate } = useSWR<Project>(
		projectId ? `/api/projects/${projectId}` : null,
		fetcher,
	);

	return {
		project: data,
		error,
		isLoading,
		mutate,
	};
}
