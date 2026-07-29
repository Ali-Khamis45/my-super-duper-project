import type { Drink } from "../types";

export const drinks: Drink[] = [
  {
    id: "classic-espresso",
    name: "Classic Espresso",
    category: "espresso",
    price: 3.5,
    tagline: "A double shot, pulled slow, poured proud.",
    description:
      "Our house blend, pulled as a true double shot — no shortcuts, no rushing. The base every other drink on this menu is built from.",
    tags: ["strong", "no milk"],
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    category: "espresso",
    price: 4.5,
    tagline: "Equal parts bold and cloud-soft.",
    description:
      "Espresso, steamed milk, and a generous cap of microfoam in exact thirds — the ratio the drink was named for, still worth getting right.",
    tags: ["classic", "foam"],
  },
  {
    id: "flat-white",
    name: "Flat White",
    category: "espresso",
    price: 4.75,
    tagline: "Velvet microfoam, no drama.",
    description:
      "A double ristretto under a thin layer of silky, barely-there foam. Smaller than a latte, stronger, and quietly the favorite behind the counter.",
    tags: ["smooth", "strong"],
  },
  {
    id: "caramel-macchiato",
    name: "Caramel Macchiato",
    category: "espresso",
    price: 5.25,
    tagline: "Caramel first, coffee second, joy always.",
    description:
      "Vanilla-marked steamed milk, espresso poured through the top, finished with a real caramel drizzle — not syrup from a pump.",
    tags: ["sweet", "vanilla"],
  },
  {
    id: "mocha",
    name: "Mocha",
    category: "espresso",
    price: 5.5,
    tagline: "Where dessert and coffee stop arguing.",
    description:
      "Dark chocolate melted directly into the espresso before the milk goes in, so the chocolate is a base note, not an afterthought stirred on top.",
    tags: ["chocolate", "rich"],
  },
  {
    id: "original-cold-brew",
    name: "Original Cold Brew",
    category: "cold-brew",
    price: 4.75,
    tagline: "Steeped slow, poured cold, never bitter.",
    description:
      "Coarse-ground beans steeped in cold water for eighteen hours. Naturally sweeter and lower-acid than iced hot-brewed coffee, by design, not accident.",
    tags: ["smooth", "low acid"],
  },
  {
    id: "nitro-cold-brew",
    name: "Nitro Cold Brew",
    category: "cold-brew",
    price: 5.25,
    tagline: "Cascades like a stout. Tastes like nothing else.",
    description:
      "Our cold brew, charged with nitrogen and poured through a widget for that signature cascading pour and creamy head — no dairy required.",
    tags: ["creamy", "no dairy needed"],
  },
  {
    id: "iced-vanilla-latte",
    name: "Iced Vanilla Latte",
    category: "cold-brew",
    price: 5.0,
    tagline: "Sweet, cold, and quietly perfect.",
    description:
      "Espresso over ice with cold milk and real vanilla bean syrup — the drink that convinces people who say they don't like coffee that they do.",
    tags: ["sweet", "iced"],
  },
  {
    id: "pumpkin-spice-latte",
    name: "Pumpkin Spice Latte",
    category: "seasonal",
    price: 5.75,
    tagline: "Autumn, in a cup, on purpose.",
    description:
      "Real pumpkin, not just the spice blend — cinnamon, clove, nutmeg, and steamed milk over espresso. Available while the season lasts.",
    tags: ["fall", "spiced"],
  },
  {
    id: "peppermint-mocha",
    name: "Peppermint Mocha",
    category: "seasonal",
    price: 5.75,
    tagline: "Winter's favorite plot twist.",
    description:
      "Our mocha with real crushed peppermint, topped with whipped cream and a dusting of cocoa. Cold-weather comfort in a cup.",
    tags: ["winter", "chocolate"],
  },
  {
    id: "honey-lavender-latte",
    name: "Honey Lavender Latte",
    category: "seasonal",
    price: 5.5,
    tagline: "Calm, in liquid form.",
    description:
      "Local honey and a whisper of culinary lavender, steamed into milk over a double shot. Floral, not perfumed — a house favorite in spring.",
    tags: ["floral", "honey"],
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    category: "tea",
    price: 4.75,
    tagline: "Earthy, whisked, wide awake.",
    description:
      "Ceremonial-grade matcha, hand-whisked and steamed with milk of your choice. Gentle, sustained energy — no crash, no jitters.",
    tags: ["caffeine", "no coffee"],
  },
  {
    id: "chai-latte",
    name: "Chai Latte",
    category: "tea",
    price: 4.5,
    tagline: "Spice-forward, warmly stubborn.",
    description:
      "Black tea steeped with cinnamon, cardamom, ginger, and clove, steamed with milk. Bold enough to hold its own against espresso drinkers.",
    tags: ["spiced", "no coffee"],
  },
  {
    id: "jasmine-green-tea",
    name: "Jasmine Green Tea",
    category: "tea",
    price: 3.75,
    tagline: "Quiet, floral, unbothered.",
    description:
      "Loose-leaf green tea scented with real jasmine blossoms, steeped fresh to order. The lightest thing on the menu, and proud of it.",
    tags: ["light", "caffeine-free option"],
  },
];
