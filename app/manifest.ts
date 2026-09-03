import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BibliaAPP - Estudio Bíblico y Comunidad",
    short_name: "BibliaAPP",
    description: "Lee la Biblia, guarda notas, sigue planes de lectura y conéctate con tu comunidad cristiana.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#10b981",
    orientation: "portrait",
    categories: ["books", "lifestyle", "education"],
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
