import type { NextConfig } from "next";

// Dev is accessed through the VS Code Web proxy at /proxy/3000, which strips
// that prefix before forwarding to this server — so routes must stay
// unprefixed (no basePath) while emitted asset URLs and client-side fetches
// need the prefix added back on, since the browser resolves both directly
// against the proxy origin.
const DEV_PROXY_PREFIX =
	process.env.NODE_ENV === "development" ? "/proxy/3000" : "";

const nextConfig: NextConfig = {
	output: "standalone",
	assetPrefix: DEV_PROXY_PREFIX || undefined,
	env: {
		NEXT_PUBLIC_BASE_PATH: DEV_PROXY_PREFIX,
	},
};

export default nextConfig;
