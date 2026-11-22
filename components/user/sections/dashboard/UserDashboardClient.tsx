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
  ChevronRight,
  CreditCard,
  Crown,
  Inbox,
  LayoutDashboard,
  Plus,
  Mail,
  UserCheck,
  Users,
  Maximize2,
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
import { FOCUS } from "@/components/user/navigation/UserSidebar";
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
  Tip,
  TOKENS,
  cn,
  fetcher,
  fmtDate,
  money,
  timeAgo,
  titleCase,
  useProfile,
  ProfileSheet,
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
  { id: "overview", label: "Overview", icon: LayoutDashboard, tip: "Invitations at a glance" },
  { id: "analytics", label: "Analytics", icon: BarChart3, tip: "Reply trends and charts" },
  { id: "activity", label: "Activity", icon: Activity, tip: "Replies, payments, updates" },
  { id: "billing", label: "Billing", icon: CreditCard, tip: "Plan and payment history" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Hairline used between rows and under headers. */
const DIVIDE = "divide-black/[0.06]";
/** Small uppercase label used on cards. */
const EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500";

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
      <div className="w-full space-y-3 sm:space-y-5">
        <DashboardHero firstName={user.first_name} />
        <div className="grid grid-cols-1 items-start gap-3 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-3 sm:space-y-5">
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

/* ========================================================================== */
/*  Hero                                                                      */
/*  Same treatment as the library header: the image, softened from the left,  */
/*  solid ink title with one orange word, actions on a frosted tray.          */
/* ========================================================================== */

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
      transition={{ duration: 0.5, ease: EASE }}
      className="relative overflow-hidden rounded-2xl bg-[#fff8f2] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)] ring-1 ring-black/[0.06] sm:rounded-3xl"
    >
      <Image
        src={ART.hero}
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 960px, 100vw"
        className="object-cover object-[70%_center]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#fff8f2]/95 via-[#fff8f2]/70 to-[#fff8f2]/30 sm:bg-gradient-to-r sm:from-[#fff8f2]/95 sm:via-[#fff8f2]/65 sm:to-[#fff8f2]/10"
      />

      <div className="relative z-10 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:p-7">
        <div className="min-w-0">
          <h1
            className={cn(
              HEADING,
              "break-words text-[26px] leading-8 text-[#1c1410] sm:text-4xl sm:leading-10",
            )}
          >
            Welcome back, <span className="text-orange-600">{firstName}</span>.
          </h1>
          <p className="mt-1 min-h-5 max-w-md text-[13px] font-medium leading-5 text-stone-600 sm:text-sm">
            {today && <span>{today}. </span>}Here’s how your invitations are
            doing.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/70 p-1.5 shadow-sm ring-1 ring-white/80 backdrop-blur-md sm:shrink-0">
          <Tip label="Start from a template" side="bottom">
            <Link
              href="/dashboard/library"
              className={cn(BTN, "rounded-lg px-3 py-1.5 text-[13px] sm:px-4 sm:py-2 sm:text-sm", FOCUS)}
            >
              <Plus className="size-4" strokeWidth={2.5} /> New invitation
            </Link>
          </Tip>
          <Tip label="Every guest reply, in one list" side="bottom">
            <Link
              href="/dashboard/rsvps"
              className={cn(
                BTN_DARK,
                "rounded-lg px-3 py-1.5 text-[13px] sm:px-4 sm:py-2 sm:text-sm",
                FOCUS,
              )}
            >
              View RSVPs <ArrowUpRight className="size-4 text-amber-300" />
            </Link>
          </Tip>
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
    <Tip label="Compare plans" side="top">
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
    </Tip>
  );
}

/* ========================================================================== */
/*  Dock (sticky tabs)                                                        */
/*  Selection is ink, same as the library filters.                            */
/* ========================================================================== */

function DashboardDock({
  user,
  tab,
  onTab,
}: {
  user: DashboardUser;
  tab: TabId;
  onTab: (t: TabId) => void;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const { planName, isFree, fullName, rows } = useProfile(user);

  return (
    <div className={cn("sticky z-30", STICKY_TOP)}>
      <div className="overflow-hidden rounded-2xl bg-white/90 shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)] ring-1 ring-black/[0.06] backdrop-blur-xl">
        {/* below xl the side card is hidden, so this row opens the profile sheet */}
        <div className="border-b border-black/[0.06] xl:hidden">
          <Tip label="Open your profile" side="bottom">
            <button
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-label="Open your profile"
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left",
                FOCUS,
              )}
            >
              <Avatar name={user.first_name} className="size-8 text-sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#1c1410]">
                  {fullName}
                </span>
                <span className="block truncate text-xs text-stone-500">
                  {user.email}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-black/[0.06]">
                {planName}
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white">
                <Maximize2 className="size-3.5" />
              </span>
            </button>
          </Tip>
        </div>

        <Tabs value={tab} onValueChange={(v) => onTab(v as TabId)}>
          <TabsList
            aria-label="Dashboard sections"
            className="grid h-auto w-full grid-cols-4 gap-1 rounded-none bg-transparent p-1.5"
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <Tip key={t.id} label={t.tip} side="bottom">
                  <TabsTrigger
                    value={t.id}
                    className={cn(
                      "relative flex-col gap-0.5 rounded-xl bg-transparent px-1 py-2 text-[11px] font-semibold shadow-none transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm",
                      "data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none",
                      "data-[state=inactive]:text-stone-600 data-[state=inactive]:hover:text-[#1c1410]",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="dash-tab"
                        className="absolute inset-0 rounded-xl bg-neutral-900 shadow-sm"
                        transition={{
                          type: "spring",
                          damping: 30,
                          stiffness: 400,
                        }}
                      />
                    )}
                    <t.icon className="relative size-4" strokeWidth={1.75} />
                    <span className="relative">{t.label}</span>
                  </TabsTrigger>
                </Tip>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <ProfileSheet
        user={user}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        isFree={isFree}
        fullName={fullName}
        rows={rows}
      />
    </div>
  );
}

function ProfileCard({ user }: { user: DashboardUser }) {
  const { isFree, fullName, rows } = useProfile(user);
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <aside
        aria-label="Account"
        className="hidden w-full xl:sticky xl:top-3 xl:block"
      >
        <Surface variant="dark" image={ART.texture} pad="p-5">
          <div className="relative">
            <div className="absolute right-0 top-0 z-20">
              <Tip label="Open full profile" side="left">
                <button
                  onClick={() => setIsOpen(true)}
                  aria-label="Open full profile"
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md bg-white/10 text-orange-50 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95",
                    FOCUS,
                  )}
                >
                  <Maximize2 className="size-3.5" />
                </button>
              </Tip>
            </div>

            <div className="flex items-center gap-3 pr-10">
              <Avatar name={user.first_name} className="size-11 text-base" />
              <div className="min-w-0">
                <h2
                  className={cn(HEADING, "truncate text-base leading-tight")}
                >
                  {fullName}
                </h2>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Account
                </p>
              </div>
            </div>

            <p className="mt-3 break-all text-xs text-stone-300">
              {user.email}
            </p>
          </div>

          <dl className="mt-4 divide-y divide-white/10 border-t border-white/10">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <dt className="text-stone-400">{r.label}</dt>
                <dd className="min-w-0 truncate">
                  {r.chip ? (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-orange-200 ring-1 ring-inset ring-white/15">
                      {r.value}
                    </span>
                  ) : (
                    <span className="font-semibold tabular-nums">
                      {r.value}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {isFree && <UpgradeLink className="mt-4" />}
        </Surface>
      </aside>

      <ProfileSheet
        user={user}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        isFree={isFree}
        fullName={fullName}
        rows={rows}
      />
    </>
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
      <div className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
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
    <div className="space-y-3 sm:space-y-4">
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
          delay={0.06}
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
          delay={0.12}
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

        {/* same anatomy as StatCell: eyebrow, big value, quiet detail */}
        <Surface className="h-full" pad="p-4 sm:p-5" delay={0.18}>
          <p className={cn("flex items-center gap-1.5", EYEBROW)}>
            <Trophy
              className="size-4 shrink-0 text-amber-500"
              strokeWidth={1.75}
            />
            Most active
          </p>
          {top ? (
            <>
              <p
                className={cn(
                  HEADING,
                  "mt-2 line-clamp-2 text-xl leading-7 text-[#1c1410] sm:text-2xl sm:leading-8",
                )}
                title={top.title}
              >
                {top.title}
              </p>
              <p className="mt-2 inline-flex w-fit rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-black/[0.06]">
                {top.rsvp_count} {top.rsvp_count === 1 ? "reply" : "replies"}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Your top invitation shows here.
            </p>
          )}
        </Surface>
      </StatGrid>

      {slugs > 0 && (
        <Surface pad="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/[0.06]">
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
              <p className="text-xs text-stone-500">
                Pick an invitation and give it a link your guests will remember.
              </p>
            </div>
            <Tip label="Set a custom link" side="top">
              <Link
                href="/dashboard/invitations"
                className={cn(BTN, "rounded-full px-4 py-2 text-xs", FOCUS)}
              >
                Choose invitation <ArrowUpRight className="size-3.5" />
              </Link>
            </Tip>
          </div>
        </Surface>
      )}

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
        <Surface className="lg:col-span-3">
          <CardHead
            title="Recent invitations"
            href="/dashboard/invitations"
            tip="See all invitations"
          />
          {invites.length === 0 ? (
            <EmptyState
              art={ART.builder}
              title="Create your first invitation"
              hint="Pick a template, personalise it, and publish in minutes."
              actionLabel="Browse templates"
              href="/dashboard/library"
            />
          ) : (
            <ul className={cn("divide-y", DIVIDE)}>
              {invites.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold tracking-tight text-[#1c1410]">
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
          <CardHead
            title="Latest replies"
            href="/dashboard/rsvps"
            tip="See all replies"
          />
          {rsvps.length === 0 ? (
            <EmptyState
              art={ART.rsvp}
              title="No replies yet"
              hint="Share an invitation link and guest replies will appear here."
            />
          ) : (
            <ul className={cn("divide-y", DIVIDE)}>
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
                      <p className="truncate text-sm font-semibold tracking-tight text-[#1c1410]">
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
      <div className="space-y-3 sm:space-y-4">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
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
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
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
                        stopOpacity={0.25}
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
                        stopOpacity={0.18}
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
                    strokeOpacity={0.8}
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
            <Tip label="Review and edit RSVPs" side="left">
              <Link
                href="/dashboard/rsvps"
                className={cn(
                  "rounded-md text-xs font-semibold text-orange-300 transition-colors hover:text-orange-200",
                  FOCUS,
                )}
              >
                Manage
              </Link>
            </Tip>
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
                  <span className="mt-1 text-xs text-stone-400">guests</span>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs">
                {pie.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-stone-300">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: p.fill }}
                      />
                      {p.name}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {p.value}{" "}
                      <span className="text-stone-400">
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
                    className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10"
                  >
                    <p className="text-xs text-stone-400">{l}</p>
                    <p className={cn(HEADING, "text-xl tabular-nums")}>{v}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
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
                <CartesianGrid
                  stroke={TOKENS.grid}
                  strokeOpacity={0.8}
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
                  fill={TOKENS.orange}
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
            tip="Open all notifications"
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
          <ul className={cn("divide-y border-t border-black/[0.06]", DIVIDE)}>
            {data.map((item) => {
              const s =
                ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.notification;
              return (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => setSelected(item)}
                    aria-label={`Open ${item.title}`}
                    className={cn(
                      "group/item flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-stone-50 sm:px-5",
                      FOCUS,
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ring-1",
                        s.cls,
                      )}
                    >
                      <s.icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold tracking-tight text-[#1c1410]">
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
                    <ChevronRight className="mt-1.5 size-4 shrink-0 text-stone-300 transition-transform group-hover/item:translate-x-0.5 group-hover/item:text-stone-500" />
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

const TH = "h-9 text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500";

function BillingTab() {
  const { data, error, mutate } = useSWR<Billing>(
    "/user/dashboard/billing",
    fetcher,
  );

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data)
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );

  const sub = data.activeSubscription;
  const orders = data.recentOrders ?? [];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-400">
              Current plan
            </p>
            <p className={cn(HEADING, "mt-2 text-3xl")}>
              {sub?.plan_name || "Free Tier"}
            </p>
            <p className="mt-1 text-xs text-stone-300">
              {sub
                ? `${money(sub.price)}, renews ${fmtDate(sub.expires_at)}`
                : "Upgrade whenever your event grows."}
            </p>
            {!sub && (
              <Tip label="Compare plans" side="top">
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
              </Tip>
            )}
          </div>
        </Surface>

        <Surface>
          <p className={EYEBROW}>Lifetime spend</p>
          <p className={cn(HEADING, "mt-2 text-4xl tabular-nums text-[#1c1410]")}>
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
            tip="Open full billing"
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
              <TableRow className="border-black/[0.06] hover:bg-transparent">
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
                  className="border-black/[0.06] transition-colors hover:bg-stone-50"
                >
                  <TableCell className="pl-4 sm:pl-5">
                    <p className="text-sm font-semibold tracking-tight text-[#1c1410]">
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