const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefixes a root-relative app URL (e.g. "/api/projects") with the app's
 * base path, if any. Needed because the browser resolves root-relative
 * fetch/img URLs against the page origin, not the current path — which
 * breaks under a reverse proxy that mounts the app under a sub-path.
 */
export function apiUrl(path: string): string {
	return `${BASE_PATH}${path}`;
}

export const fetcher = (url: string) =>
	fetch(apiUrl(url)).then((r) => r.json());
