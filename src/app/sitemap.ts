import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** The public pages for search engines. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/registrer", 0.9, "monthly"),
    page("/faq", 0.8, "monthly"),
    page("/dokumentasjon", 0.8, "monthly"),
    page("/tripletex", 0.8, "monthly"),
    page("/logg-inn", 0.4, "yearly"),
    page("/personvern", 0.3, "yearly"),
    page("/vilkar", 0.3, "yearly"),
    page("/databehandleravtale", 0.3, "yearly"),
  ];
}
