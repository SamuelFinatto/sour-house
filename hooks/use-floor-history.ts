import useSWR from "swr";
import { fetcher } from "@/lib/api";

interface FloorVersion {
	version: string;
	timestamp: number;
}

export function useFloorHistory(projectId: string, floorId: string) {
	const { data, error, isLoading, mutate } = useSWR<FloorVersion[]>(
		`/api/projects/${projectId}/floors/${floorId}/history`,
		fetcher,
	);

	return {
		versions: data ?? [],
		error,
		isLoading,
		mutate,
	};
}
