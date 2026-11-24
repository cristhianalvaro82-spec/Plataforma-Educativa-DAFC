import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Archivos Excel (asignaturas, nóminas) llegan por acciones del servidor.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
