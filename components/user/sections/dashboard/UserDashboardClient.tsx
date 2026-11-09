"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn, EASE, VIEW, TabId, TABS, FOCUS } from "./constants";
import { DashboardUser } from "./types";

import { Dock } from "./tabs/Dock";
import { ProfileCard } from "./tabs/ProfileCard";
import { OverviewTab } from "./tabs/OverviewTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { BillingTab } from "./tabs/BillingTab";

export function UserDashboardClient({ user }: { user: DashboardUser }) {
  const [tab, setTab] = React.useState<TabId>("overview");
  const [today, setToday] = React.useState("");
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setToday(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const selectTab = (id: TabId) => {
    setTab(id);
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const swipe = (dx: number, vx: number) => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (dx < -70 || vx < -500) i < TABS.length - 1 && selectTab(TABS[i + 1].id);
    else if (dx > 70 || vx > 500) i > 0 && selectTab(TABS[i - 1].id);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEW}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-semibold text-orange-600">{today}</p>
          <h1 className="break-words text-[1.8rem] font-extrabold leading-[1.05] tracking-tighter text-slate-900 sm:text-5xl font-[family-name:var(--font-display)]">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-[#f97316] via-amber-500 to-rose-500 bg-clip-text text-transparent">
              {user.first_name}
            </span>
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-600 sm:text-base">Here’s how your invitations are doing.</p>
        </div>
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} className="shrink-0">
          <Link href="/dashboard/library" className={cn("inline-flex items-center gap-2 rounded-full border border-orange-300/60 bg-gradient-to-b from-orange-400 to-orange-600 px-5 py-3 text-sm font-semibold text-white", "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_28px_-8px_rgba(249,115,22,0.9)]", FOCUS)}>
            <Plus className="size-4" strokeWidth={2.5} /> New invitation
          </Link>
        </motion.div>
      </motion.header>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <Dock user={user} tab={tab} onTab={selectTab} />
          
          <div ref={panelRef} className="scroll-mt-32 sm:scroll-mt-20">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                role="tabpanel"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22, ease: EASE }}
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={(_, info) => swipe(info.offset.x, info.velocity.x)}
                style={{ touchAction: "pan-y" }}
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
  );
}