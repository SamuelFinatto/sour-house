"use client";

import useSWR from "swr";
import type { FloorSymbol } from "@/types/symbol";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSymbols() {
	const { data, error, isLoading, mutate } = useSWR<FloorSymbol[]>(
		"/api/symbols",
		fetcher,
	);

	return {
		symbols: data ?? [],
		isLoading,
		error,
		mutate,
	};
}
