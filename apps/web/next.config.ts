import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	poweredByHeader: false,
	transpilePackages: ["@ai-webmail/db", "@ai-webmail/domain"],
};

export default nextConfig;
