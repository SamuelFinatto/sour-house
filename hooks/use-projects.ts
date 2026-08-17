import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { ProjectSummary } from "@/types/project";

export function useProjects() {
	const { data, error, isLoading, mutate } = useSWR<ProjectSummary[]>(
		"/api/projects",
		fetcher,
	);

	return {
		projects: data ?? [],
		error,
		isLoading,
		mutate,
	};
}
