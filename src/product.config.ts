import { defineProduct } from "@/lib/product"

export const product = defineProduct({
  name: "Lanes",
  tagline: "Boards, cards and lanes for every team. Plan it, move it, ship it.",
  accent: "#60a5fa",
  nav: [{ href: "/dashboard/my-cards", label: "My cards" }],
  resources: [],
})
