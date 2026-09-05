import { createFileRoute } from "@tanstack/react-router";
import { ScrapGame } from "@/components/ScrapGame";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scrap.io — Neon Scrapyard Robot Survival" },
      {
        name: "description",
        content:
          "Pilot a salvage drone through a neon scrapyard city: collect scrap, bolt on components, ram rival bots to steal their parts, and reach the extraction zone.",
      },
      { property: "og:title", content: "Scrap.io — Neon Scrapyard Robot Survival" },
      {
        property: "og:description",
        content:
          "Collect scrap, upgrade your chassis, steal parts from rival robots and extract before they do.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScrapGame,
});
