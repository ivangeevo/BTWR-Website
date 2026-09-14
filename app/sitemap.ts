import type { MetadataRoute } from "next";
import { enableRoadmap, siteUrl } from "@/lib/site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/mods", "/community", "/get-btwr"];

  if (enableRoadmap) {
    routes.push("/roadmap");
  }

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
