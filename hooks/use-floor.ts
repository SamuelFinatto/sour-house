import type { Floor } from "@/types/floor";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
