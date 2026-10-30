import { CreditCard, Heart, Lock, Scale, ShieldCheck, type LucideIcon } from "lucide-react";

export interface NavCategory {
  id: string | number;
  name: string;
  slug: string;
  thumbnail_url?: string | null;
  template_count?: number;
}

export interface NavUser {
  name?: string;
  email?: string;
}

export interface PrivacyLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/plans", label: "Plans", icon: CreditCard },
  { href: "/about", label: "Our Ethos", icon: Heart },
];

export const PRIVACY_LINKS: PrivacyLink[] = [
  { href: "/privacy", label: "Data & Privacy", description: "How we handle your data", icon: ShieldCheck },
  { href: "/terms", label: "The Fine Print", description: "Terms of service", icon: Scale },
  { href: "/cookies", label: "Cookie Policy", description: "What we store and why", icon: Lock },
];