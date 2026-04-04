import type { ProjectSummary } from "@/types/project";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
