import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  CreditCard,
  LayoutTemplate,
  Mail,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

// NOTE: these are defined locally (same values as UserSidebar) because
// UserSidebar is a "use client" module, and a server component can't import
// plain string constants from it.
const RAISED =
  "bg-gradient-to-b from-white via-white to-orange-50/60 border border-orange-100/70 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.05),0_8px_20px_-8px_rgba(249,115,22,0.28)]";

const ORB_ON =
  "bg-gradient-to-b from-orange-400 to-orange-600 text-white " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_12px_-4px_rgba(249,115,22,0.75)]";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const ACTIONS: QuickAction[] = [
  {
    title: "Browse templates",
    description: "Pick a design for your next event.",
    href: "/dashboard/library",
    icon: LayoutTemplate,
  },
  {
    title: "My invitations",
    description: "Edit, share or review what you've created.",
    href: "/dashboard/invitations",
    icon: Mail,
  },
  {
    title: "RSVPs",
    description: "See who's coming and who hasn't replied.",
    href: "/dashboard/rsvps",
    icon: Users,
  },
  {
    title: "Billing & plan",
    description: "Check your plan and payment history.",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
];

const STEPS = [
  { title: "Choose a template", href: "/dashboard/library" },
  { title: "Customize your invitation", href: "/dashboard/invitations" },
  { title: "Share the link with your guests", href: "/dashboard/invitations" },
  { title: "Track RSVPs as they arrive", href: "/dashboard/rsvps" },
];

export default async function DashboardPage() {
  const h = await headers();
  const firstName =
    h.get("x-user-first-name") ||
    (h.get("x-user-name") || "").trim().split(/\s+/)[0] ||
    h.get("x-user-email")?.split("@")[0] ||
    "there";

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Welcome */}
      <section
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-8 ${RAISED}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-orange-300/30 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span
            className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:flex ${ORB_ON}`}
          >
            <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Welcome, {firstName}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-neutral-500 sm:text-base">
              Create beautiful invitations, share them with guests and keep
              track of every reply, all from one place.
            </p>
            <Link
              href="/dashboard/library"
              className={`mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold ${ORB_ON} transition-transform active:scale-[0.98] ${FOCUS}`}
            >
              Create an invitation
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {ACTIONS.map(({ title, description, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`group flex h-full min-h-[84px] items-center gap-3 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-px active:scale-[0.99] sm:flex-col sm:items-start sm:gap-4 ${RAISED} ${FOCUS}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100/70 bg-white/70 text-orange-500 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-neutral-900">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {description}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-orange-500 sm:hidden"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Getting started */}
      <section className={`rounded-3xl p-5 sm:p-6 ${RAISED}`}>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-neutral-900">
          Get started
        </h2>
        <ol className="mt-3 flex flex-col gap-1">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Link
                href={step.href}
                className={`flex min-h-[48px] items-center gap-3 rounded-xl px-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-orange-50 active:bg-orange-50 ${FOCUS}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-xs font-semibold text-orange-600">
                  {i + 1}
                </span>
                <span className="flex-1">{step.title}</span>
                <ArrowRight
                  className="h-4 w-4 text-neutral-300"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}