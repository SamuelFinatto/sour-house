import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { Project } from "@/types/project";

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
