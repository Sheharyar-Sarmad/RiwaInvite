"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Crown,
  Inbox,
  LayoutDashboard,
  Plus,
  Mail,
  UserCheck,
  Users,
  Trophy,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./ui/Tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FOCUS, RAISED } from "@/components/user/navigation/UserSidebar";
import {
  ACTIVITY_STYLE,
  ActivitySheet,
  BTN,
  BTN_DARK,
  CardHead,
  ChartCard,
  ChartTooltip,
  EASE,
  EmptyState,
  ErrorCard,
  HEADING,
  ORB,
  Skeleton,
  StatCell,
  StatGrid,
  StatusChip,
  STICKY_TOP,
  Surface,
  TiltCard,
  TOKENS,
  cn,
  fetcher,
  fmtDate,
  money,
  timeAgo,
  titleCase,
  useProfile,
  type ActivityItem,
  type Analytics,
  type Billing,
  type DashboardUser,
  type Overview,
} from "./ui/DashboardUI";

export type { DashboardUser };

const ART = {
  hero: "/user_dashboard_bg.png",
  texture: "/ethos-hero-bg.png",
  rsvp: "/why-rsvp.png",
  builder: "/why-builder.png",
  slugs: "/why-slugs.png",
  plans: "/why-plans.png",
  iconInvites: "/invitations-3d.png",
  iconAccepted: "/accepted-rsvp-3d.png",
  iconGuests: "/expected-guests-3d.png",
  iconActive: "/most-active-trophy-3d.png",
} as const;

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function UserDashboardClient({ user }: { user: DashboardUser }) {
  const [tab, setTab] = React.useState<TabId>("overview");
  const panelRef = React.useRef<HTMLDivElement>(null);

  const selectTab = (id: TabId) => {
    setTab(id);
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (el && el.getBoundingClientRect().top < 0)
        el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full space-y-4 sm:space-y-6">
        <DashboardHero firstName={user.first_name} />
        <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4 sm:space-y-6">
            <DashboardDock user={user} tab={tab} onTab={selectTab} />
            <div ref={panelRef} className="scroll-mt-32 sm:scroll-mt-20">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  id={`panel-${tab}`}
                  role="tabpanel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {tab === "overview" && <OverviewTab />}
                  {tab === "analytics" && <AnalyticsTab />}
                  {tab === "activity" && <ActivityTab />}
                  {tab === "billing" && <BillingTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <ProfileCard user={user} />
        </div>
      </div>
    </MotionConfig>
  );
}

function DashboardHero({ firstName }: { firstName: string }) {
  const [today, setToday] = React.useState("");
  React.useEffect(() => {
    setToday(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-2xl border border-orange-100 shadow-sm bg-[#fff7ed]"
    >
      {/* 1. Image is now fully opaque */}
      <Image
        src={ART.hero}
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 960px, 100vw"
        className="object-cover object-right opacity-100"
      />

      {/* 2. Gradient only covers the left side for text readability, fading completely out on the right */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#fff7ed] via-[#fff7ed]/90 to-transparent"
      />

      <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h1
            className={cn(
              HEADING,
              "break-words text-2xl leading-tight text-neutral-900 sm:text-3xl",
            )}
          >
            Welcome back, <span className="text-orange-600">{firstName}</span>.
          </h1>
          <p className="mt-1 min-h-5 max-w-md text-sm font-medium text-neutral-600">
            {today && <span className="text-neutral-500">{today}. </span>}Here’s
            how your invitations are doing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Link
            href="/dashboard/library"
            className={cn(BTN, "rounded-lg px-4 py-2 text-sm shadow-md", FOCUS)}
          >
            <Plus className="size-4" strokeWidth={2.5} /> New invitation
          </Link>
          <Link
            href="/dashboard/rsvps"
            className={cn(
              BTN_DARK,
              "rounded-lg px-4 py-2 text-sm shadow-md",
              FOCUS,
            )}
          >
            View RSVPs <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        ORB,
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function UpgradeLink({ className }: { className?: string }) {
  return (
    <Link
      href="/plans"
      className={cn(
        BTN,
        "group/up justify-between px-4 py-2.5 text-sm",
        FOCUS,
        className,
      )}
    >
      <span className="flex items-center gap-2">
        <Crown className="size-4" strokeWidth={1.75} /> Upgrade to Pro
      </span>
      <ArrowUpRight className="size-4 transition-transform group-hover/up:-translate-y-0.5 group-hover/up:translate-x-0.5" />
    </Link>
  );
}

function DashboardDock({
  user,
  tab,
  onTab,
}: {
  user: DashboardUser;
  tab: TabId;
  onTab: (t: TabId) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { planName, isFree, fullName, rows } = useProfile(user);

  return (
    <div className={cn("sticky z-30", STICKY_TOP)}>
      <div
        className={cn("overflow-hidden rounded-2xl backdrop-blur-xl", RAISED)}
      >
        <div className="border-b border-orange-100 xl:hidden">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2 text-left",
              FOCUS,
            )}
          >
            <Avatar name={user.first_name} className="size-8 text-sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {fullName}
              </span>
              <span className="block truncate text-xs text-stone-500">
                {user.email}
              </span>
            </span>
            <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
              {planName}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-stone-400 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="overflow-hidden"
              >
                <dl className="grid grid-cols-2 gap-2 px-3 pb-3">
                  {rows
                    .filter((r) => !r.chip)
                    .map((r) => (
                      <div
                        key={r.label}
                        className="min-w-0 rounded-xl border border-orange-100 bg-white/70 px-3 py-2"
                      >
                        <dt className="text-xs text-stone-500">{r.label}</dt>
                        <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums">
                          {r.value}
                        </dd>
                      </div>
                    ))}
                  {isFree && <UpgradeLink className="col-span-2" />}
                </dl>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Tabs value={tab} onValueChange={(v) => onTab(v as TabId)}>
          <TabsList
            aria-label="Dashboard sections"
            className="grid h-auto w-full grid-cols-4 gap-1 rounded-none bg-transparent p-1.5"
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className={cn(
                    "relative flex-col gap-0.5 rounded-xl bg-transparent px-1 py-2 text-[11px] font-semibold shadow-none transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm",
                    "data-[state=active]:bg-transparent data-[state=active]:text-orange-700 data-[state=active]:shadow-none",
                    "data-[state=inactive]:text-stone-600 data-[state=inactive]:hover:text-[#431407]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="dash-tab"
                      className="absolute inset-0 rounded-xl bg-orange-100/80 shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05)]"
                      transition={{
                        type: "spring",
                        damping: 30,
                        stiffness: 400,
                      }}
                    >
                      <span
                        aria-hidden
                        className="absolute -left-px top-1/2 hidden h-4 w-[3px] -translate-y-1/2 rounded-full bg-orange-500 sm:block"
                      />
                    </motion.span>
                  )}
                  <t.icon
                    className={cn(
                      "relative size-4",
                      active && "text-orange-600",
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="relative">{t.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

function ProfileCard({ user }: { user: DashboardUser }) {
  const { isFree, fullName, rows } = useProfile(user);
  return (
    <aside
      aria-label="Account"
      className="hidden w-full xl:sticky xl:top-3 xl:block"
    >
      <Surface variant="dark" image={ART.texture} pad="p-5">
        <div className="flex items-center gap-3">
          <Avatar name={user.first_name} className="size-12 text-lg" />
          <div className="min-w-0">
            <h2 className={cn(HEADING, "truncate text-lg")}>{fullName}</h2>
            <p
              className="truncate text-xs text-orange-200/70"
              title={user.email}
            >
              {user.email}
            </p>
          </div>
        </div>

        <dl className="mt-5 divide-y divide-orange-200/10 border-t border-orange-200/10">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <dt className="text-orange-200/60">{r.label}</dt>
              <dd className="min-w-0 truncate">
                {r.chip ? (
                  <span className="rounded-full border border-orange-400/30 bg-orange-400/15 px-2.5 py-0.5 text-xs font-semibold text-orange-200">
                    {r.value}
                  </span>
                ) : (
                  <span className="font-semibold tabular-nums">{r.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        {isFree && <UpgradeLink className="mt-4" />}
      </Surface>
    </aside>
  );
}

/* ========================================================================== */
/*  Overview                                                                  */
/* ========================================================================== */

function OverviewTab() {
  const { data, error, mutate } = useSWR<Overview>(
    "/user/dashboard/overview",
    fetcher,
  );
  const { data: analytics } = useSWR<Analytics>(
    "/user/dashboard/analytics",
    fetcher,
  );

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-72 lg:col-span-3" />
          <Skeleton className="h-72 lg:col-span-2" />
        </div>
      </div>
    );

  const s = data.stats;
  const stats = {
    totalInvitations: s?.totalInvitations ?? 0,
    activeInvitations: s?.activeInvitations ?? 0,
    totalRSVPs: s?.totalRSVPs ?? 0,
    totalGuests: s?.totalGuests ?? 0,
    rsvpsThisWeek: s?.rsvpsThisWeek ?? 0,
    guestsThisWeek: s?.guestsThisWeek ?? 0,
  };
  const invites = data.recentInvitations ?? [];
  const rsvps = data.recentRSVPs ?? [];
  const top = data.mostActiveInvitation ?? null;
  const slugs = data.actionItems?.unclaimedCustomSlugs ?? 0;
  const trend = analytics?.rsvpTrend ?? [];

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatCell
          variant="dark"
          delay={0}
          label="Invitations"
          icon={Mail}
          value={stats.totalInvitations}
          hint={
            stats.activeInvitations
              ? `${stats.activeInvitations} live`
              : "None live yet"
          }
          series={trend.map((d) => d.accepted + d.declined)}
          accent={TOKENS.amber}
        />
        <StatCell
          delay={0.08}
          label="Accepted RSVPs"
          icon={UserCheck}
          value={stats.totalRSVPs}
          delta={
            stats.rsvpsThisWeek
              ? `+${stats.rsvpsThisWeek} this week`
              : undefined
          }
          hint="No new this week"
          series={trend.map((d) => d.accepted)}
          accent={TOKENS.orange}
        />
        <StatCell
          delay={0.16}
          label="Expected guests"
          icon={Users}
          value={stats.totalGuests}
          delta={
            stats.guestsThisWeek
              ? `+${stats.guestsThisWeek} this week`
              : undefined
          }
          hint="No new this week"
          series={trend.map((d) => d.accepted + d.declined)}
          accent={TOKENS.emerald}
        />
        <TiltCard>
          <Surface className="h-full" pad="p-5" delay={0.24}>
            <motion.span
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-orange-50 text-orange-600 ring-1 ring-orange-200"
              style={{
                boxShadow:
                  "0 8px 24px -6px #ea580c80, inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <Trophy className="size-5" strokeWidth={2} />
            </motion.span>
            <p className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.14em] text-stone-500">
              Most active
            </p>
            {top ? (
              <>
                <p
                  className={cn(
                    HEADING,
                    "mt-1.5 line-clamp-2 text-2xl leading-tight text-[#2a1002]",
                  )}
                  title={top.title}
                >
                  {top.title}
                </p>
                <p className="mt-3 inline-flex w-fit rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                  {top.rsvp_count} {top.rsvp_count === 1 ? "reply" : "replies"}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Your top invitation shows here.
              </p>
            )}
          </Surface>
        </TiltCard>
      </StatGrid>

      {slugs > 0 && (
        <Surface pad="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative h-14 w-20 shrink-0 rounded-xl overflow-hidden border border-orange-100 shadow-sm">
              <Image
                src={ART.slugs}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn(HEADING, "text-base")}>
                {slugs} custom link{slugs > 1 ? "s" : ""} ready to use
              </p>
              <p className="text-xs text-stone-600">
                Pick an invitation and give it a link your guests will remember.
              </p>
            </div>
            <Link
              href="/dashboard/invitations"
              className={cn(BTN, "rounded-full px-4 py-2 text-xs", FOCUS)}
            >
              Choose invitation <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </Surface>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Surface className="lg:col-span-3">
          <CardHead title="Recent invitations" href="/dashboard/invitations" />
          {invites.length === 0 ? (
            <EmptyState
              art={ART.builder}
              title="Create your first invitation"
              hint="Pick a template, personalise it, and publish in minutes."
              actionLabel="Browse templates"
              href="/dashboard/library"
            />
          ) : (
            <ul className="divide-y divide-orange-100">
              {invites.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold tracking-tight">
                      {item.title}
                    </h4>
                    <p className="mt-0.5 flex gap-2 text-xs text-stone-500">
                      <span className="truncate">
                        {item.slug ? `/invite/${item.slug}` : "No custom link"}
                      </span>
                      <span className="shrink-0 text-stone-400">
                        {fmtDate(item.created_at)}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="hidden text-right min-[420px]:block">
                      <p className="text-sm font-bold leading-none tabular-nums">
                        {item.rsvp_count}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">guests</p>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="lg:col-span-2">
          <CardHead title="Latest replies" href="/dashboard/rsvps" />
          {rsvps.length === 0 ? (
            <EmptyState
              art={ART.rsvp}
              title="No replies yet"
              hint="Share an invitation link and guest replies will appear here."
            />
          ) : (
            <ul className="divide-y divide-orange-100">
              {rsvps.map((r, i) => {
                const dot =
                  r.attendance_status === "accepted"
                    ? "bg-emerald-500"
                    : r.attendance_status === "declined"
                      ? "bg-rose-500"
                      : "bg-amber-500";
                return (
                  <li
                    key={`${r.guest_name}-${i}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <span
                      className={cn(
                        "relative flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        ORB,
                      )}
                    >
                      {r.guest_name.charAt(0).toUpperCase()}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white",
                          dot,
                        )}
                      />
                      <span className="sr-only">
                        {titleCase(r.attendance_status)}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight">
                        {r.guest_name}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {r.number_of_guests} guest
                        {r.number_of_guests === 1 ? "" : "s"} for{" "}
                        {r.invitation_title}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-stone-400">
                      {timeAgo(r.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Surface>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Analytics                                                                 */
/* ========================================================================== */

const AXIS = { fontSize: 11, fill: TOKENS.axis } as const;
const PARTS = ["Morning", "Afternoon", "Evening", "Night"] as const;

function AnalyticsTab() {
  const { data, error, mutate } = useSWR<Analytics>(
    "/user/dashboard/analytics",
    fetcher,
  );

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data)
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );

  const trend = data.rsvpTrend ?? [];
  const hourly = data.hourlyRSVPs ?? [];
  const topSrc = data.topInvitations ?? [];
  const b = data.guestBreakdown ?? { accepted: 0, declined: 0, pending: 0 };

  const total = b.accepted + b.declined + b.pending;
  const rate = total
    ? Math.round(((b.accepted + b.declined) / total) * 100)
    : 0;
  const pie = [
    { name: "Accepted", value: b.accepted, fill: TOKENS.emerald },
    { name: "Declined", value: b.declined, fill: TOKENS.rose },
    { name: "Pending", value: b.pending, fill: TOKENS.stone },
  ];
  const hours = PARTS.map((k) => ({
    name: k,
    count: hourly.find((h) => h.time_of_day === k)?.count ?? 0,
  }));
  const top = topSrc.map((t) => ({ name: t.title, value: t.total_rsvps }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Replies in the last 30 days"
          description="Accepted and declined, per day"
          className="lg:col-span-2"
        >
          {trend.length === 0 ? (
            <EmptyState
              art={ART.rsvp}
              title="No replies charted yet"
              hint="Daily replies will chart here once guests respond."
            />
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend}
                  margin={{ top: 8, right: 4, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={TOKENS.orange}
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="100%"
                        stopColor={TOKENS.orange}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="gDec" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={TOKENS.stone}
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor={TOKENS.stone}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke={TOKENS.grid}
                    strokeOpacity={0.6}
                    strokeDasharray="2 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={AXIS}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    tick={AXIS}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{
                      stroke: TOKENS.ink,
                      strokeOpacity: 0.25,
                      strokeDasharray: "3 3",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="accepted"
                    name="Accepted"
                    stroke={TOKENS.orange}
                    strokeWidth={2}
                    fill="url(#gAcc)"
                  />
                  <Area
                    type="monotone"
                    dataKey="declined"
                    name="Declined"
                    stroke={TOKENS.stone}
                    strokeWidth={2}
                    fill="url(#gDec)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          dark
          image={ART.texture}
          title="Guest responses"
          action={
            <Link
              href="/dashboard/rsvps"
              className={cn(
                "rounded-md text-xs font-semibold text-orange-200/70 transition-colors hover:text-orange-100",
                FOCUS,
              )}
            >
              Manage
            </Link>
          }
        >
          {total === 0 ? (
            <EmptyState
              dark
              art={ART.rsvp}
              title="No responses yet"
              hint="Share an invitation to start collecting RSVPs."
            />
          ) : (
            <>
              <div className="relative mx-auto h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="70%"
                      outerRadius="100%"
                      paddingAngle={3}
                      cornerRadius={3}
                      stroke="none"
                    >
                      {pie.map((p) => (
                        <Cell key={p.name} fill={p.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={cn(
                      HEADING,
                      "text-4xl leading-none tabular-nums",
                    )}
                  >
                    {total.toLocaleString()}
                  </span>
                  <span className="mt-1 text-xs text-orange-200/60">
                    guests
                  </span>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs">
                {pie.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-orange-100/80">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: p.fill }}
                      />
                      {p.name}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {p.value}{" "}
                      <span className="text-orange-200/50">
                        ({Math.round((p.value / total) * 100)}%)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ["Response rate", `${rate}%`],
                  ["Plus-ones", String(data.totalPlusOnes ?? 0)],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="rounded-xl border border-orange-200/10 bg-orange-200/10 px-3 py-2 backdrop-blur-sm"
                  >
                    <p className="text-xs text-orange-200/60">{l}</p>
                    <p className={cn(HEADING, "text-xl tabular-nums")}>{v}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="When guests reply"
          description="Replies by time of day"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hours}
                margin={{ top: 8, right: 4, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TOKENS.amber} />
                    <stop offset="100%" stopColor={TOKENS.orange} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={TOKENS.grid}
                  strokeOpacity={0.6}
                  strokeDasharray="2 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: TOKENS.orange, fillOpacity: 0.06 }}
                />
                <Bar
                  dataKey="count"
                  name="Replies"
                  fill="url(#gBar)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top invitations" description="Most answered">
          {top.length === 0 ? (
            <EmptyState
              art={ART.builder}
              title="Nothing ranked yet"
              hint="Your most-answered invitations will rank here."
            />
          ) : (
            <div style={{ height: Math.max(180, top.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: "#57534e" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: TOKENS.orange, fillOpacity: 0.06 }}
                  />
                  <Bar
                    dataKey="value"
                    name="RSVPs"
                    fill={TOKENS.orange}
                    radius={[0, 6, 6, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Activity                                                                  */
/* ========================================================================== */

function ActivityTab() {
  const { data, error, mutate } = useSWR<ActivityItem[]>(
    "/user/dashboard/activity",
    fetcher,
  );
  const [selected, setSelected] = React.useState<ActivityItem | null>(null);
  const close = React.useCallback(() => setSelected(null), []);

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <>
      <Surface pad="p-0">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardHead
            title="Recent activity"
            href="/dashboard/notifications"
            cta="See all"
          />
        </div>
        {data.length === 0 ? (
          <div className="p-4 pt-0 sm:p-5 sm:pt-0">
            <EmptyState
              icon={Inbox}
              art={ART.rsvp}
              title="Nothing yet"
              hint="Replies, payments and updates will show up here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-orange-100 border-t border-orange-100">
            {data.map((item) => {
              const s =
                ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.notification;
              return (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => setSelected(item)}
                    aria-label={`Open ${item.title}`}
                    className={cn(
                      "group/item flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-orange-50/70 sm:px-5",
                      FOCUS,
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
                        s.cls,
                      )}
                    >
                      <s.icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold tracking-tight">
                          {item.title}
                        </span>
                        <span className="shrink-0 text-xs text-stone-400">
                          {timeAgo(item.created_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-stone-600">
                        {item.message}
                      </span>
                    </span>
                    <ChevronRight className="mt-1.5 size-4 shrink-0 text-stone-300 transition-transform group-hover/item:translate-x-0.5 group-hover/item:text-orange-500" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>
      <ActivitySheet item={selected} onClose={close} />
    </>
  );
}

/* ========================================================================== */
/*  Billing                                                                   */
/* ========================================================================== */

const TH = "h-9 text-xs font-semibold text-stone-500";

function BillingTab() {
  const { data, error, mutate } = useSWR<Billing>(
    "/user/dashboard/billing",
    fetcher,
  );

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data)
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );

  const sub = data.activeSubscription;
  const orders = data.recentOrders ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Surface variant="dark" image={ART.texture}>
          <div
            className="pointer-events-none absolute -right-4 bottom-0 h-[110%] w-[55%] opacity-80 mix-blend-screen [mask-image:linear-gradient(to_left,black_30%,transparent_100%)]"
            aria-hidden
          >
            <Image
              src={ART.plans}
              alt=""
              fill
              sizes="200px"
              className="object-contain object-right-bottom"
            />
          </div>

          <div className="relative z-10 max-w-[60%]">
            <p className="text-xs font-semibold text-orange-200/70">
              Current plan
            </p>
            <p className={cn(HEADING, "mt-2 text-3xl")}>
              {sub?.plan_name || "Free Tier"}
            </p>
            <p className="mt-1 text-xs text-orange-200/70">
              {sub
                ? `${money(sub.price)}, renews ${fmtDate(sub.expires_at)}`
                : "Upgrade whenever your event grows."}
            </p>
            {!sub && (
              <Link
                href="/plans"
                className={cn(
                  BTN,
                  "mt-4 rounded-full px-4 py-2 text-sm",
                  FOCUS,
                )}
              >
                <Crown className="size-4" strokeWidth={1.75} /> Upgrade{" "}
                <ArrowUpRight className="size-3.5" />
              </Link>
            )}
          </div>
        </Surface>

        <Surface>
          <p className="text-xs font-semibold text-stone-500">Lifetime spend</p>
          <p className={cn(HEADING, "mt-2 text-4xl tabular-nums")}>
            {money(data.lifetimeSpend ?? 0)}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {orders.length} recent order{orders.length === 1 ? "" : "s"}
          </p>
        </Surface>
      </div>

      <Surface pad="p-0">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardHead
            title="Payment history"
            href="/dashboard/billing"
            cta="Full billing"
          />
        </div>
        {orders.length === 0 ? (
          <div className="p-4 pt-0 sm:p-5 sm:pt-0">
            <EmptyState
              art={ART.plans}
              title="No payments yet"
              hint="Completed orders will be listed here."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-orange-100 hover:bg-transparent">
                <TableHead className={cn(TH, "pl-4 sm:pl-5")}>Order</TableHead>
                <TableHead className={cn(TH, "hidden sm:table-cell")}>
                  Date
                </TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={cn(TH, "pr-4 text-right sm:pr-5")}>
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow
                  key={o.id}
                  className="border-orange-100 transition-colors hover:bg-orange-50/60"
                >
                  <TableCell className="pl-4 sm:pl-5">
                    <p className="text-sm font-semibold tracking-tight">
                      {titleCase(o.order_type || "Order")}
                    </p>
                    <p className="max-w-[10rem] truncate font-mono text-[11px] text-stone-500 sm:max-w-xs">
                      {o.provider_order_id || "N/A"}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-xs text-stone-600 sm:table-cell">
                    {fmtDate(o.created_at)}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={o.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-sm font-bold tabular-nums sm:pr-5">
                    {money(o.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
