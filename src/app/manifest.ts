import type { MetadataRoute } from "next";

// Permite instalar o NewFarmer na tela inicial do celular (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NewFarmer",
    short_name: "NewFarmer",
    start_url: "/painel",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#3f6b3a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
