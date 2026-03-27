import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

export default withSerwist({
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zvouwsalqipsxuuyaczd.supabase.co',
      },
    ],
  },
  // @anthropic-ai/sdk는 Node.js 전용이므로 webpack 번들에서 제외
  serverExternalPackages: ['@anthropic-ai/sdk'],
  typescript: { ignoreBuildErrors: true },
  turbopack: {},
});
