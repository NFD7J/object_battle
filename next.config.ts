import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Images d'objets envoyées sur le CDN Vercel Blob (§7).
        // Sans cette autorisation, next/image refuse d'afficher un domaine
        // externe — c'est volontaire, cela évite de servir n'importe quelle URL.
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
