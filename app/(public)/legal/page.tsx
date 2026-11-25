import type { Metadata, Viewport } from "next";
import { settings } from "@/config/settings_config";
import { LegalToc } from "@/components/public/sections/legal/LegalToc";
import { AmbientBackdrop } from "@/components/ui/AmbientBackdrop";

const appUrl = settings().appUrl;
// TODO: confirm the real support inbox before launch.
const CONTACT = "info@riwainvite.com";
const UPDATED = "25 November 2026";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Legal & Trust | Riwainvite",
  description:
    "How Riwainvite protects your data, what we promise about privacy, the terms of using our invitation platform, and our refund policy. Plain language, no traps.",
  keywords: [
    "Riwainvite legal",
    "privacy policy",
    "terms of service",
    "refund policy",
    "trust center",
    "data protection",
  ],
  authors: [{ name: "Riwainvite", url: appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  applicationName: "Riwainvite",
  alternates: { canonical: "/legal" },
  openGraph: {
    title: "Legal & Trust | Riwainvite",
    description:
      "Our trust center, privacy promise, terms of engagement and refund policy — in plain language.",
    url: `${appUrl}/legal`,
    siteName: "Riwainvite",
    locale: "en_US",
    type: "website",
    // Drop in /og-legal-image.png (1200×630) when exported; omitted until the asset exists.
  },
  twitter: {
    card: "summary",
    title: "Legal & Trust | Riwainvite",
    description:
      "Our trust center, privacy promise, terms of engagement and refund policy — in plain language.",
    creator: "@riwainvite",
    site: "@riwainvite",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
  appleWebApp: {
    capable: true,
    title: "Riwainvite",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#fdeadb" };

const SECTIONS = [
  {
    id: "trust",
    title: "Trust center",
    body: [
      "Every request is authorized on the server against a verified session — never against anything your browser claims. Your data is scoped to your account in every query and every cache entry, so one customer can never read another's.",
      "Sensitive credentials you add (such as your own AI provider key) are encrypted at rest with AES-256-GCM and are never logged, never cached in plaintext, and never sent anywhere except the provider you chose.",
      "Payments are verified by cryptographic signature and processed exactly once, even if a provider retries. Guest RSVP endpoints are rate-limited and capped to keep public links abuse-resistant.",
      "Administrative access is least-privilege and hard-capped at two accounts. Security reports are welcome at " +
        CONTACT +
        " — we acknowledge within two business days.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy promise",
    body: [
      "We collect what the product needs: your account details (name, email, optional phone), the invitation content you create, your guests' RSVP replies (name, attendance, seats, optional comment), and payment metadata (reference, amount, status).",
      "We do not sell your data, we do not run advertising trackers, and we do not log your AI prompts or your provider key. Error logs record failure names only — never your content.",
      "Rehearsal drafts keep a backup in your own browser's local storage until synced or discarded; discarding a draft also removes its uploaded media from our storage.",
      "Deleting your account anonymizes your identity. Payment records are retained only as long as reconciliation and legal obligations require.",
      "You are the controller of your guests' data: tell your guests you collect RSVPs, and export or delete their list from your dashboard at any time (CSV, Excel or PDF).",
    ],
  },
  {
    id: "terms",
    title: "Terms of engagement",
    body: [
      "One account may hold one active subscription at a time. Plan allowances are those displayed at the moment of purchase; prices are in PKR. Single template purchases grant a licence for your own events — not for resale or redistribution of the underlying design.",
      "Custom URLs must be lawful and must not impersonate people or brands; we may reclaim abusive slugs. Published invitation links expire five days after the event date.",
      "You own the content you create. You are responsible for having the rights to any media you upload and for informing your guests about RSVP collection.",
      "The AI Studio runs on your own provider key: you bear the provider's costs and must be entitled to use that key. AI output is a proposal — nothing changes in your design until you approve it.",
      "Do not use Riwainvite for unlawful, hateful or deceptive content, or to abuse public RSVP links. We may suspend accounts that do. Our liability is capped at the amounts you paid us in the three months preceding a claim. These terms are governed by the laws of Pakistan; material changes are announced via dashboard notifications.",
    ],
  },
  {
    id: "refunds",
    title: "No-refund policy",
    body: [
      "Digital entitlements are delivered instantly, so all sales are final. Change-of-mind refunds are not available once a template or plan is unlocked.",
      "Three narrow exceptions exist, and they are enforced by our payment logs, not by goodwill alone:",
    ],
    list: {
      heading: "When we do refund",
      items: [
        "A duplicate charge for the same entitlement (for example a second plan payment while one was already active).",
        "A payment that completed but whose entitlement was never applied.",
        "A provider-side error evidenced in our payment records.",
      ],
    },
    tail: [
      "To claim, write to " +
        CONTACT +
        " within 7 days with your transaction reference. We verify against payment logs and return approved refunds through the original payment channel.",
    ],
  },
  {
    id: "cookies",
    title: "Cookie notice",
    body: [
      "We set exactly one cookie: a first-party session cookie that keeps you signed in. It is httpOnly — page scripts cannot read it — marked Secure in production, and restricted to our own site. On our servers we store only a cryptographic hash of the session token, never the token itself.",
      "It expires 24 hours after sign-in. Signing out deletes the cookie and destroys the server-side session immediately; “log out everywhere” destroys every device's session at once.",
      "We set no advertising, analytics or third-party cookies, and we do not track you across other websites.",
      "Because this cookie is strictly necessary for sign-in, blocking it in your browser means we cannot keep you signed in. The public site — templates, plans, ethos and this page — works without it.",
    ],
    list: {
      heading: "What lives on your device",
      items: [
        "Session cookie — sign-in state · httpOnly · expires 24h after login · deleted on logout",
        "Local storage — your sidebar collapsed/expanded preference",
        "Local storage — an on-device rehearsal draft backup, removed when the draft syncs or is discarded",
      ],
    },
    tail: ["Questions about any of this: " + CONTACT + "."],
  },
] as const;

export default function LegalPage() {
  return (
    <main className="relative isolate w-full bg-white">
      <AmbientBackdrop />

      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <header className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
            Legal & Trust
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[#1c1410] sm:text-4xl">
            Plain language. No traps.
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            Last updated {UPDATED}. Questions: {CONTACT}
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
          <LegalToc
            sections={SECTIONS.map((s) => ({ id: s.id, title: s.title }))}
          />

          <div className="space-y-14 rounded-3xl bg-white/85 p-6 shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05),0_14px_30px_-14px_rgba(249,115,22,0.35)] ring-1 ring-black/[0.06] backdrop-blur-xl sm:p-10">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[#1c1410]">
                  {s.title}
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-600">
                  {s.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {"list" in s && s.list && (
                    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.06]">
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                        {s.list.heading}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {s.list.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {"tail" in s &&
                    s.tail?.map((p, i) => <p key={`t${i}`}>{p}</p>)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
