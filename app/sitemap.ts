import type { MetadataRoute } from "next";

import { getMetadataBase } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getMetadataBase();
  const lastModified = new Date();

  return ["/", "/faq", "/privacy", "/terms"].map((path) => ({
    url: new URL(path, base).toString(),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
