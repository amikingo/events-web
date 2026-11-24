import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // Cache Components is deliberately off (project decision: no caching). `partialPrefetching` requires it, so it is off
  // too. Pages render on every request; see `dynamic = "force-dynamic"` in app/(home)/layout.tsx.
  // Every sign-in screen is one page now: /auth. Old addresses open it on the matching step.
  async redirects() {
    const to = (source: string, destination: string) => ({ source, destination, permanent: false });
    return [
      ...["login", "sign-in", "sign-in/verify", "login/verify", "auth/login", "auth/sign-in", "auth/sign-in/verify", "auth/login/verify"].map((p) => to(`/${p}`, "/auth")),
      ...["sign-up", "auth/sign-up"].map((p) => to(`/${p}`, "/auth?step=sign-up")),
      ...["forgot-password", "auth/forgot-password"].map((p) => to(`/${p}`, "/auth?step=forgot")),
      ...["reset-password", "auth/reset-password"].map((p) => to(`/${p}`, "/auth?step=reset")),
      ...["verify-account", "auth/verify-account"].map((p) => to(`/${p}`, "/auth?step=two-step")),
      // The marketplace lives at the root now (/, /events, /my-tickets, …); the old /home addresses follow it.
      to("/home", "/"),
      to("/home/:path*", "/:path*"),
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
