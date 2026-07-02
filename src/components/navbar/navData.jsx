// src/components/navbar/navData.js
import {
  Sparkles,
  Crown,
  Scissors,
  Layers,
  Star,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "Women", to: "/women", hasMega: true, key: "women" },
  { label: "Men", to: "/men", hasMega: true, key: "men" },
  { label: "Kids", to: "/kids", hasMega: true, key: "kids" },
  { label: "Tailoring", to: "/custom-tailoring", hasMega: true, key: "tailoring" },
  { label: "Collections", to: "/collections", hasMega: true, key: "collections" },
  { label: "About", to: "/about", hasMega: false, key: "about" },
  { label: "Contact", to: "/contact", hasMega: false, key: "contact" },
];

export const MEGA_MENUS = {
  women: {
    icon: Sparkles,
    tagline: "The Atelier — Womenswear",
    categories: [
      { label: "Lehengas", to: "/women/lehengas" },
      { label: "Salwar Suits", to: "/women/salwar-suits" },
      { label: "Kurtis", to: "/women/kurtis" },
      { label: "Gowns", to: "/women/gowns" },
      { label: "Co-ord Sets", to: "/women/co-ord-sets" },
      { label: "Party Wear", to: "/women/party-wear" },
      { label: "Bridal", to: "/women/bridal" },
      { label: "Festive", to: "/women/festive" },
    ],
    featured: [
      { label: "The Bridal Edit", to: "/collections/wedding" },
      { label: "Festive Couture", to: "/collections/festive" },
      { label: "Signature Lehengas", to: "/women/lehengas" },
      { label: "New Arrivals", to: "/women?sort=new" },
    ],
    promo: {
      title: "Bridal Couture 2025",
      subtitle: "Handcrafted heirlooms, made to be remembered.",
      to: "/collections/wedding",
    },
  },
  men: {
    icon: Crown,
    tagline: "The Atelier — Menswear",
    categories: [
      { label: "Sherwani", to: "/men/sherwani" },
      { label: "Kurta", to: "/men/kurta" },
      { label: "Blazers", to: "/men/blazers" },
      { label: "Suits", to: "/men/suits" },
      { label: "Formal", to: "/men/formal" },
      { label: "Casual", to: "/men/casual" },
    ],
    featured: [
      { label: "The Groom's Edit", to: "/collections/wedding" },
      { label: "Tailored Suiting", to: "/men/suits" },
      { label: "Festive Kurtas", to: "/men/kurta" },
      { label: "New Arrivals", to: "/men?sort=new" },
    ],
    promo: {
      title: "The Modern Groom",
      subtitle: "Sherwanis & bandhgalas, precision-tailored.",
      to: "/men/sherwani",
    },
  },
  kids: {
    icon: Star,
    tagline: "The Atelier — Kidswear",
    categories: [
      { label: "Girls", to: "/kids/girls" },
      { label: "Boys", to: "/kids/boys" },
      { label: "Ethnic", to: "/kids/ethnic" },
      { label: "Party Wear", to: "/kids/party-wear" },
    ],
    featured: [
      { label: "Little Celebrations", to: "/collections/festive" },
      { label: "Ethnic Charmers", to: "/kids/ethnic" },
      { label: "Party Ready", to: "/kids/party-wear" },
      { label: "New Arrivals", to: "/kids?sort=new" },
    ],
    promo: {
      title: "Tiny Traditions",
      subtitle: "Festive finery for the little ones.",
      to: "/kids/ethnic",
    },
  },
  tailoring: {
    icon: Scissors,
    tagline: "Bespoke Tailoring House",
    categories: [
      { label: "Custom Stitching", to: "/custom-tailoring/custom-stitching" },
      { label: "Alterations", to: "/custom-tailoring/alterations" },
      { label: "Measurements", to: "/custom-tailoring/measurements" },
      { label: "Consultation", to: "/custom-tailoring/consultation" },
    ],
    featured: [
      { label: "Made-to-Measure", to: "/custom-tailoring/custom-stitching" },
      { label: "Book a Fitting", to: "/custom-tailoring/consultation" },
      { label: "Measurement Guide", to: "/custom-tailoring/measurements" },
      { label: "Our Craft", to: "/about" },
    ],
    promo: {
      title: "Crafted For You",
      subtitle: "A garment shaped by hand, measured to perfection.",
      to: "/custom-tailoring/consultation",
    },
  },
  collections: {
    icon: Layers,
    tagline: "Curated Collections",
    categories: [
      { label: "Wedding", to: "/collections/wedding" },
      { label: "Festive", to: "/collections/festive" },
      { label: "Formal", to: "/collections/formal" },
      { label: "Casual", to: "/collections/casual" },
      { label: "Designer", to: "/collections/designer" },
    ],
    featured: [
      { label: "Editor's Picks", to: "/collections/designer" },
      { label: "Seasonal Lines", to: "/collections/festive" },
      { label: "The Wedding Vault", to: "/collections/wedding" },
      { label: "All Collections", to: "/collections" },
    ],
    promo: {
      title: "The Designer Edit",
      subtitle: "Limited atelier pieces, in signature silhouettes.",
      to: "/collections/designer",
    },
  },
};

export const MOBILE_ACCORDION = NAV_LINKS.map((link) => {
  if (link.hasMega) {
    return {
      ...link,
      children: MEGA_MENUS[link.key].categories,
    };
  }
  return { ...link, children: null };
});