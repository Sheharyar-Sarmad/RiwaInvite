"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  useAdminAnalytics,
  OverallBusinessData, UsersData, InvitationsData, RsvpsData,
  RevenueFocusedData, OrdersData, TemplatesData, SubscriptionsData,
} from "@/hooks/useAdminAnalytics";
import { MetricCard } from "@/components/admin/cards/MetricCard";
import { DashboardCard } from "@/components/admin/cards/DashboardCard";
import { RevenueSection } from "@/components/admin/sections/RevenueSection";
import { ACCENTS, Accent } from "@/components/admin/cards/CardFrame";
import { CustomAreaChart, CustomPieChart, CustomBarChart } from "@/components/admin/charts/AllCharts";
import {
  Users, CreditCard, Banknote, Mail, TrendingUp, ShoppingBag,
  FileText, CheckCircle, Calendar, ShieldCheck, Heart, DollarSign, LucideIcon,
} from "lucide-react";

type Range = "7d" | "30d" | "90d" | "all";

const SECTIONS: { id: string; label: string; blurb: string; icon: LucideIcon; accent: Accent }[] = [
  { id: "overview", label: "Overview", blurb: "Headline numbers across the whole business", icon: TrendingUp, accent: "orange" },
  { id: "users", label: "Users", blurb: "Who is signing up and who is active", icon: Users, accent: "sky" },
  { id: "revenue", label: "Revenue", blurb: "Where the money comes from", icon: DollarSign, accent: "emerald" },
  { id: "invitations", label: "Invitations", blurb: "What customers are creating", icon: Mail, accent: "violet" },
  { id: "rsvps", label: "RSVPs", blurb: "How guests are responding", icon: Heart, accent: "rose" },
  { id: "subscriptions", label: "Subscriptions", blurb: "Plans, growth and churn", icon: CreditCard, accent: "amber" },
  { id: "orders", label: "Orders", blurb: "What is being bought, and its status", icon: ShoppingBag, accent: "indigo" },
  { id: "templates", label: "Templates", blurb: "Which designs perform best", icon: FileText, accent: "teal" },
];

const fmt = (n?: number) => (n ?? 0).toLocaleString("en-US");

export function DashboardAnalytics() {
  const [range, setRange] = useState<Range>("7d");
  const [active, setActive] = useState(SECTIONS[0].id);

  const { data: overview } = useAdminAnalytics<OverallBusinessData>("overall_business", range);
  const { data: users } = useAdminAnalytics<UsersData>("users", range);
  const { data: revenue } = useAdminAnalytics<RevenueFocusedData>("revenue_focused", range);
  const { data: invites } = useAdminAnalytics<InvitationsData>("invite", range);
  const { data: rsvps } = useAdminAnalytics<RsvpsData>("rsvps", range);
  const { data: subs } = useAdminAnalytics<SubscriptionsData>("subscriptions", range);
  const { data: orders } = useAdminAnalytics<OrdersData>("orders", range);
  const { data: templates } = useAdminAnalytics<TemplatesData>("templates", range);

  // AdminShell scrolls inside <main>, not the window, so find the real scroller
  // and feed its progress to the bar under the header.
  const rootRef = useRef<HTMLDivElement>(null);
  const rawProgress = useMotionValue(0);
  const progress = useSpring(rawProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  useEffect(() => {
    let el: HTMLElement | null = rootRef.current?.parentElement ?? null;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    const target: HTMLElement | Window = el ?? window;

    const read = () => {
      const top = el ? el.scrollTop : window.scrollY;
      const max = el
        ? el.scrollHeight - el.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      rawProgress.set(max > 0 ? Math.min(1, Math.max(0, top / max)) : 0);
    };

    read();
    target.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      target.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [rawProgress]);

  // Scrollspy: highlights the nav chip of the section crossing the middle of the viewport
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-30% 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Keep the active chip visible in the horizontally scrolling nav
  useEffect(() => {
    document.getElementById(`nav-${active}`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const activeRgb = ACCENTS[SECTIONS.find((s) => s.id === active)?.accent ?? "orange"];
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div ref={rootRef} className="space-y-16 pb-32">
      {/* Sticky command bar: title, range, section nav, scroll progress */}
      <div className="sticky top-2 z-30 overflow-hidden rounded-2xl border border-neutral-900/[0.08] bg-white/55 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-neutral-900">
            Analytics Overview
          </h2>

          <div className="relative flex items-center rounded-xl border border-neutral-900/[0.08] bg-white/70 p-1">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`relative rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                  range === r ? "text-white" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {range === r && (
                  <motion.span
                    layoutId="range-pill"
                    className="absolute inset-0 rounded-lg bg-neutral-900 shadow-md"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{r === "all" ? "All time" : `Last ${r}`}</span>
              </button>
            ))}
          </div>
        </div>

        <nav
          aria-label="Dashboard sections"
          className="flex gap-1 overflow-x-auto px-3 pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SECTIONS.map((s) => {
            const on = active === s.id;
            const rgb = ACCENTS[s.accent];
            return (
              <button
                key={s.id}
                id={`nav-${s.id}`}
                onClick={() => jump(s.id)}
                aria-current={on ? "true" : undefined}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  on ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: `rgb(${rgb} / 0.12)`, boxShadow: `inset 0 0 0 1px rgb(${rgb} / 0.3)` }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <s.icon className="relative size-3.5" style={{ color: on ? `rgb(${rgb})` : undefined }} />
                <span className="relative">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left transition-colors duration-500"
          style={{ scaleX: progress, backgroundColor: `rgb(${activeRgb})` }}
        />
      </div>

      {/* 1. OVERVIEW */}
      <Section id="overview">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total users" value={fmt(overview?.totalUsers)} icon={Users} accent="sky" delay={0.05} />
          <MetricCard title="Active subscriptions" value={fmt(overview?.activeSubscriptions)} icon={CreditCard} accent="amber" delay={0.1} />
          <MetricCard title="Total revenue" value={`₦${fmt(overview?.totalRevenue)}`} icon={Banknote} accent="emerald" delay={0.15} />
          <MetricCard title="Invitations" value={fmt(overview?.totalInvitations)} icon={Mail} accent="violet" delay={0.2} />
        </div>
      </Section>

      {/* 2. USERS */}
      <Section id="users">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="New users" value={fmt(users?.newUsers)} icon={TrendingUp} accent="sky" delay={0.05} />
          <MetricCard title="Active sessions" value={fmt(users?.activeUsers)} icon={ShieldCheck} accent="sky" delay={0.1} />
          <MetricCard title="Users in database" value={fmt(users?.totalUsers)} icon={Users} accent="sky" delay={0.15} />
        </div>
        <DashboardCard title="User growth" description="New registrations over time" accent="sky" loading={!users} live>
          <div className="h-[300px]"><CustomAreaChart data={users?.growthChart || []} dataKey="count" xKey="date" /></div>
        </DashboardCard>
      </Section>

      {/* 3. REVENUE */}
      <Section id="revenue">
        <RevenueSection revenue={revenue} range={range} />
      </Section>

      {/* 4. INVITATIONS */}
      <Section id="invitations">
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard title="Invitations created" value={fmt(invites?.totalInvitations)} icon={Mail} accent="violet" delay={0.05} />
          <DashboardCard title="Invitation status" description="Draft, published and archived" accent="violet" loading={!invites} delay={0.1}>
            <div className="h-[250px]"><CustomPieChart data={invites?.statusBreakdown || []} /></div>
          </DashboardCard>
        </div>
        <DashboardCard title="Invitations created per day" description="Creation trend" accent="violet" loading={!invites}>
          <div className="h-[250px]"><CustomAreaChart data={invites?.timeline || []} dataKey="count" xKey="date" /></div>
        </DashboardCard>
      </Section>

      {/* 5. RSVPS */}
      <Section id="rsvps">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total RSVPs" value={fmt(rsvps?.totalRsvps)} icon={CheckCircle} accent="rose" delay={0.05} />
          <MetricCard title="Expected guests" value={fmt(rsvps?.expectedGuests)} icon={Users} accent="rose" delay={0.1} />
          <DashboardCard title="RSVP status" description="Attending and declined" className="md:col-span-2" accent="rose" loading={!rsvps} delay={0.15}>
            <div className="h-[200px]"><CustomPieChart data={rsvps?.statusBreakdown || []} /></div>
          </DashboardCard>
        </div>
        <DashboardCard title="RSVP responses over time" description="When guests respond" accent="rose" loading={!rsvps}>
          <div className="h-[300px]"><CustomAreaChart data={rsvps?.timeline || []} dataKey="count" xKey="date" /></div>
        </DashboardCard>
      </Section>

      {/* 6. SUBSCRIPTIONS */}
      <Section id="subscriptions">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Active subscriptions" value={fmt(subs?.activeSubscriptions)} icon={CreditCard} accent="amber" delay={0.05} />
          <MetricCard title="Churned or canceled" value={fmt(subs?.churnedSubscriptions)} icon={TrendingUp} accent="rose" delay={0.1} />
          <DashboardCard title="Plan distribution" description="Which plans people pick" accent="amber" loading={!subs} delay={0.15}>
            <div className="h-[220px]"><CustomPieChart data={subs?.planBreakdown || []} /></div>
          </DashboardCard>
        </div>
        <DashboardCard title="New subscriptions" description="New subscribers over time" accent="amber" loading={!subs}>
          <div className="h-[250px]"><CustomAreaChart data={subs?.timeline || []} dataKey="count" xKey="date" /></div>
        </DashboardCard>
      </Section>

      {/* 7. ORDERS */}
      <Section id="orders">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard title="Total orders" value={fmt(orders?.totalOrders)} icon={ShoppingBag} accent="indigo" delay={0.05} />
          <DashboardCard title="Order status" description="Completed and pending" accent="indigo" loading={!orders} delay={0.1}>
            <div className="h-[220px]"><CustomPieChart data={orders?.statusBreakdown || []} /></div>
          </DashboardCard>
          <DashboardCard title="Order types" description="What users are buying" accent="indigo" loading={!orders} delay={0.15}>
            <div className="h-[220px]"><CustomBarChart data={orders?.typeBreakdown || []} dataKey="value" yKey="name" /></div>
          </DashboardCard>
        </div>
        <DashboardCard title="Order volume" description="Daily transactions" accent="indigo" loading={!orders}>
          <div className="h-[250px]"><CustomAreaChart data={orders?.timeline || []} dataKey="count" xKey="date" /></div>
        </DashboardCard>
      </Section>

      {/* 8. TEMPLATES */}
      <Section id="templates">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total templates" value={fmt(templates?.totalTemplates)} icon={FileText} accent="teal" delay={0.05} />
          <MetricCard title="Premium templates" value={fmt(templates?.premiumTemplates)} icon={CheckCircle} accent="teal" delay={0.1} />
          <MetricCard title="Simple templates" value={fmt(templates?.simpleTemplates)} icon={Calendar} accent="teal" delay={0.15} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardCard title="Top templates" description="Most used designs" accent="teal" loading={!templates} delay={0.05}>
            <div className="h-[250px]"><CustomBarChart data={templates?.topTemplates || []} dataKey="value" yKey="name" /></div>
          </DashboardCard>
          <DashboardCard title="Template status" description="Draft and published" accent="teal" loading={!templates} delay={0.1}>
            <div className="h-[250px]"><CustomPieChart data={templates?.statusBreakdown || []} /></div>
          </DashboardCard>
        </div>
        <DashboardCard title="Templates added" description="When new designs ship" accent="teal" loading={!templates}>
          <div className="h-[250px]"><CustomAreaChart data={templates?.timeline || []} dataKey="count" xKey="date" /></div>
        </DashboardCard>
      </Section>
    </div>
  );
}

/** Section wrapper: anchor target for the nav, plus a header that draws itself in. */
function Section({ id, children }: { id: string; children: ReactNode }) {
  const s = SECTIONS.find((x) => x.id === id)!;
  const rgb = ACCENTS[s.accent];

  return (
    <section id={id} className="scroll-mt-40 space-y-4">
      <header className="mb-2 flex items-center gap-3">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-xl text-white"
          style={{
            background: `linear-gradient(135deg, rgb(${rgb}), rgb(${rgb} / 0.7))`,
            boxShadow: `0 10px 22px -8px rgb(${rgb} / 0.7), inset 0 1px 0 rgba(255,255,255,0.35)`,
          }}
        >
          <s.icon className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-neutral-900">
            {s.label}
          </h3>
          <p className="truncate text-sm text-neutral-500">{s.blurb}</p>
        </div>
        <motion.div
          aria-hidden
          className="ml-2 hidden h-px flex-1 origin-left sm:block"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: `linear-gradient(90deg, rgb(${rgb} / 0.55), transparent)` }}
        />
      </header>
      {children}
    </section>
  );
}