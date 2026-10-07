import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	poweredByHeader: false,
	transpilePackages: ["@ai-webmail/db"],
};

export default nextConfig;
