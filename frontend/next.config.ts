import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repository root also has a package.json (Supabase CLI), so tell
  // Turbopack to treat the frontend folder as the workspace root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
