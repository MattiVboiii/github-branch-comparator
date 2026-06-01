import type { MetadataRoute } from "next";

import { getMetadataBase } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getMetadataBase();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
