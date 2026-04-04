import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the Turbopack/webpack mismatch warning — our webpack config is for
  // build-time output settings only; Turbopack handles WASM natively.
  turbopack: {},

  // COOP/COEP headers — required for SharedArrayBuffer (DuckDB threading)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
