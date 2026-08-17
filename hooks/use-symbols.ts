"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { FloorSymbol } from "@/types/symbol";

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
