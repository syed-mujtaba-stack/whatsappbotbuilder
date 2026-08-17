import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow QR code images served as data URLs from the backend
  images: {
    remotePatterns: [],
    dangerouslyAllowSVG: true,
  },

  // Needed so next/image doesn't block data: URIs from whatsapp-web.js QR
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
