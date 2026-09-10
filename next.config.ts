import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Images d'objets hébergées sur Cloudinary (§7).
        // Sans cette autorisation, next/image refuse d'afficher un domaine
        // externe — c'est volontaire, cela évite de servir n'importe quelle URL.
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
