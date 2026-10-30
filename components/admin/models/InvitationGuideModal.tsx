"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Mail, ShieldAlert, Eye, CheckCircle2, XCircle, UserX, Archive, BookOpen } from "lucide-react";

const SECTIONS = [
  { id: "what", label: "What is an invitation?" },
  { id: "role", label: "Your role" },
  { id: "why", label: "Why it's read-only" },
  { id: "violations", label: "Handling violations" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const STATUSES = [
  { name: "Draft", tone: "bg-gray-100 text-gray-600 border-gray-200", desc: "Being built. No public link is live." },
  { name: "Published", tone: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "Live. Guests can open the link." },
  { name: "Expired", tone: "bg-amber-100 text-amber-700 border-amber-200", desc: "The event date has passed." },
  { name: "Archived", tone: "bg-red-100 text-red-700 border-red-200", desc: "Taken offline, usually after a user is soft-deleted." },
];

const PERMISSIONS: { action: string; allowed: boolean }[] = [
  { action: "See who created an invitation and which template they used", allowed: true },
  { action: "Check whether an invitation is published, expired or archived", allowed: true },
  { action: "Preview the page exactly as guests see it", allowed: true },
  { action: "Copy or open the public link", allowed: true },
  { action: "Edit the design, names, date or venue", allowed: false },
  { action: "Delete or archive a single invitation", allowed: false },
];

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mb-3 scroll-mt-4 text-lg font-bold tracking-tight text-gray-900 font-[family-name:var(--font-display)]">
      {children}
    </h3>
  );
}

export function InvitationGuideModal({ onClose }: { onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<SectionId>("what");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Scroll-spy: highlight the last section whose top has passed the reading line.
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    let current: SectionId = SECTIONS[0].id;
    for (const s of SECTIONS) {
      const el = container.querySelector<HTMLElement>(`#${s.id}`);
      if (el && el.offsetTop - container.scrollTop <= 80) current = s.id;
    }
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 4) {
      current = SECTIONS[SECTIONS.length - 1].id;
    }
    setActive(current);
  };

  const jumpTo = (id: SectionId) => {
    const container = scrollRef.current;
    const el = container?.querySelector<HTMLElement>(`#${id}`);
    if (!container || !el) return;
    container.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
    setActive(id);
  };

  return (
    <div data-lenis-prevent className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-gray-900/60 backdrop-blur-md"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Invitation management guide"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative z-10 flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white bg-[#fffafb] shadow-2xl"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        {/* Header */}
        <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-orange-100/50 bg-white/70 px-6 py-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2.5 text-orange-600 shadow-inner">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-[family-name:var(--font-display)]">Invitation management</h2>
              <p className="text-xs text-gray-500 font-[family-name:var(--font-body)]">How monitoring works on Riwainvite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="rounded-full border border-gray-100 bg-white/80 p-2 text-gray-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="relative z-10 flex min-h-0 flex-1">
          {/* Sticky table of contents */}
          <nav className="hidden w-56 shrink-0 border-r border-orange-100/50 p-6 md:block" aria-label="Guide sections">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-gray-400 font-[family-name:var(--font-display)]">
              <BookOpen className="h-3.5 w-3.5" /> On this page
            </p>
            <ul className="space-y-1">
              {SECTIONS.map((s) => {
                const isActive = active === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => jumpTo(s.id)}
                      className={`relative w-full rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer font-[family-name:var(--font-body)] ${
                        isActive ? "font-semibold text-orange-600" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="toc-active"
                          transition={{ type: "spring", damping: 30, stiffness: 400 }}
                          className="absolute inset-0 -z-10 rounded-lg bg-orange-50"
                        />
                      )}
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Article */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-lenis-prevent
            className="no-scrollbar relative min-w-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-6 py-8 md:px-10"
          >
            <article className="mx-auto max-w-2xl space-y-12 font-[family-name:var(--font-body)]">
              {/* What */}
              <section>
                <Heading id="what">What is an invitation?</Heading>
                <p className="text-sm leading-relaxed text-gray-600">
                  An invitation is the public web page a paying user creates for their event. They pick a template, fill in the details (names, date, venue) and publish it. Riwainvite generates a link such as{" "}
                  <code className="rounded bg-orange-50 px-1.5 py-0.5 text-[13px] text-orange-600">/invite/sara-and-ahmed</code> that they send to guests.
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-orange-100/50 bg-white/70 backdrop-blur-xl">
                  <p className="border-b border-gray-100 px-4 py-2.5 text-xs font-bold text-gray-500 font-[family-name:var(--font-display)]">
                    Invitation statuses
                  </p>
                  <ul className="divide-y divide-gray-100">
                    {STATUSES.map((s) => (
                      <li key={s.name} className="flex items-center gap-4 px-4 py-3">
                        <span className={`w-24 shrink-0 rounded-md border px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider ${s.tone}`}>
                          {s.name}
                        </span>
                        <span className="text-sm text-gray-600">{s.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Role */}
              <section>
                <Heading id="role">Your role: monitor and preview</Heading>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">
                  Admins look after the platform. You can see everything that matters for support and moderation, but you can't change what users have built.
                </p>
                <div className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/50">
                  <div className="flex items-center gap-2.5 border-b border-blue-100 px-4 py-3">
                    <Eye className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-bold text-blue-900 font-[family-name:var(--font-display)]">What you can and can't do</p>
                  </div>
                  <ul className="divide-y divide-blue-100/70">
                    {PERMISSIONS.map((p) => (
                      <li key={p.action} className="flex items-start gap-3 px-4 py-3 text-sm">
                        {p.allowed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                        )}
                        <span className={p.allowed ? "text-blue-900" : "text-gray-500"}>{p.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Why */}
              <section>
                <Heading id="why">Why it's read-only</Heading>
                <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-red-50 p-5">
                  <ShieldAlert className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-red-900 opacity-5" />
                  <div className="relative flex items-start gap-4">
                    <ShieldAlert className="h-6 w-6 shrink-0 text-red-600" />
                    <p className="text-sm leading-relaxed text-red-800">
                      Invitations are the private property of the user. Admins are strictly forbidden from changing a design or its event details, and from deleting a single invitation. This protects users' work and keeps every moderation action traceable to the account it applies to.
                    </p>
                  </div>
                </div>
              </section>

              {/* Violations */}
              <section>
                <Heading id="violations">Handling violations</Heading>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">
                  If a user breaks the terms, act on the account, not the invitation.
                </p>
                <ol className="space-y-3">
                  {[
                    { Icon: Eye, title: "Preview the invitation", body: "Open the live preview and confirm the issue yourself." },
                    { Icon: UserX, title: "Soft-delete the user", body: "Go to the Users page and soft-delete the account. This revokes their access." },
                    { Icon: Archive, title: "Invitations archive automatically", body: "All of the user's invitations move to Archived and their public links go offline." },
                  ].map(({ Icon, title, body }, i) => (
                    <li key={title} className="flex gap-4 rounded-2xl border border-orange-100/50 bg-white/70 p-4 backdrop-blur-xl">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-600 font-[family-name:var(--font-display)]">
                        {i + 1}
                      </div>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-bold text-gray-900 font-[family-name:var(--font-display)]">
                          <Icon className="h-4 w-4 text-orange-500" /> {title}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </article>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex shrink-0 justify-end border-t border-orange-100/50 bg-white/70 px-6 py-4 backdrop-blur-xl md:px-8">
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-900 px-8 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-gray-800 cursor-pointer font-[family-name:var(--font-display)]"
          >
            Understood
          </button>
        </div>
      </motion.div>
    </div>
  );
}