import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "AllSeats CRM",
    short_name: "AllSeats",
    description: "CRM for hele teamet – kunder, salg, tilbud og oppgaver.",
    lang: "nb",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f6f4",
    theme_color: "#1f6f54",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Oppgaver", url: "/app/oppgaver", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Salg", url: "/app/salg", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Kontakter", url: "/app/kontakter", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
