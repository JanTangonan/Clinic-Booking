import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/reports/export/pdf": ["./node_modules/pdfkit/js/data/**"],
  },
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
