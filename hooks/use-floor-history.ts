import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
