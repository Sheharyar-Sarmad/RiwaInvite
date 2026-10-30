"use client";

import { KeyboardEvent, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, ShieldAlert, UserCog, UserPlus } from "lucide-react";
import { AccountSettingsForm, Panel } from "../../forms/AccountSettingsForm";

export type AccountTab = "account" | "register";

const TABS = [
  { id: "account", label: "My account", icon: UserCog },
  { id: "register", label: "Register admin", icon: UserPlus },
] as const;

interface Props {
  initialTab: AccountTab;
  /** When false (max admins reached) the Register tab is hidden and only the admin details show. */
  isRegistrationOpen: boolean;
  initialData: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    account_name: string;
  };
}

export function AccountTabs({ initialTab, initialData, isRegistrationOpen }: Props) {
  const [selected, setSelected] = useState<AccountTab>(initialTab);
  // If registration closes (or was never open), always fall back to the admin details
  const tab: AccountTab = isRegistrationOpen ? selected : "account";

  const select = (next: AccountTab) => {
    setSelected(next);
    // Keep the URL shareable (?tab=register) without re-running the server page
    const url = new URL(window.location.href);
    if (next === "account") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id;
    select(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-8">
        {isRegistrationOpen && (
        <div
          role="tablist"
          aria-label="Account sections"
          onKeyDown={onKeyDown}
          className="inline-flex rounded-xl border border-neutral-900/10 bg-white/80 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(t.id)}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  on ? "text-white" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="account-tab-pill"
                    className="absolute inset-0 rounded-lg bg-neutral-900 shadow-md"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <t.icon className="relative size-4" />
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === "account" ? (
              <div className="space-y-8">
                <Details data={initialData} />
                {!isRegistrationOpen && (
                  <p className="flex items-start gap-2 text-sm text-neutral-500">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-orange-500" />
                    Registration is closed. This workspace already has the maximum number of administrators.
                  </p>
                )}
                <AccountSettingsForm initialData={initialData} />
              </div>
            ) : (
              <RegisterCard />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

/** Read-only facts about this admin: the parts the edit form doesn't show. */
function Details({ data }: { data: Props["initialData"] }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: ignore */
    }
  };

  return (
    <Panel>
      <dl className="grid divide-y divide-neutral-900/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Item label="Account" value={data.account_name} />
        <Item label="Phone" value={data.phone_number || "Not set"} />
        <div className="min-w-0 p-5 sm:p-6">
          <dt className="text-xs text-neutral-500">Admin ID</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="truncate font-mono text-sm text-neutral-900">{data.id}</span>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy admin ID"
              className="grid size-7 shrink-0 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-900/5 hover:text-neutral-700"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            </button>
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 p-5 sm:p-6">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

/** The existing /admin/register page stays untouched: this tab just sends you to it. */
function RegisterCard() {
  return (
    <Panel>
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl text-white"
            style={{
              background: "linear-gradient(135deg, rgb(249 115 22), rgb(251 146 60 / 0.8))",
              boxShadow: "0 10px 22px -8px rgb(249 115 22 / 0.7), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <UserPlus className="size-5" />
          </span>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-neutral-900">
              Registration is open
            </h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-neutral-500">
              This workspace has room for another administrator. Open the registration page to create their account.
            </p>
          </div>
        </div>

        <Link
          href="/admin/register"
          className="group flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-400 active:scale-[0.98]"
        >
          Open registration
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Panel>
  );
}