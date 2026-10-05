import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** Public pages are indexed; the app itself, sign-in flows and personal links are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app",
        "/admin",
        "/api",
        "/auth",
        "/invitasjon",
        "/nytt-passord",
        "/glemt-passord",
        "/kom-i-gang",
        "/sperret",
        "/offline",
        "/sprak",
        "/tilbud/",
        "/skjema/",
        "/booking/avbestill",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
