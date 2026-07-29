import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  ...(githubPages
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath: "/Test-BTS-TIMEING-",
        assetPrefix: "/Test-BTS-TIMEING-/",
      }
    : {}),
};

export default nextConfig;
