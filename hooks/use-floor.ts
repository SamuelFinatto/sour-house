import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { Floor } from "@/types/floor";

export function useFloor(projectId: string | null, floorId: string | null) {
	const { data, error, isLoading, mutate } = useSWR<Floor>(
		projectId && floorId
			? `/api/projects/${projectId}/floors/${floorId}`
			: null,
		fetcher,
	);

	return {
		floor: data,
		error,
		isLoading,
		mutate,
	};
}
