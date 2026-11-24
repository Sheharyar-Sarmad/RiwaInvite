"use client";

/**
 * components/user/sections/rehearsal/ui/RehearsalTopBar.tsx
 *
 * Top bar for the Rehearsal editor.
 *
 *  - Builder mode switch (opens the AI panel in Auto-builder mode).
 *  - Purchase-aware primary action:
 *      owned     -> "Create invitation" (saves the draft, then goes to the create page.
 *                   No dialog: the link choice was already made at checkout)
 *      not owned -> "Unlock" (link to the checkout page)
 *      unknown   -> disabled "Checking..." while the library loads
 *  - Below `lg` the secondary actions move into a "More" menu so every
 *    control keeps a 44px touch target on a phone.
 *
 * Replaces the old `RehearsalTopBar` in RehearsalStudioUI.tsx (delete that one).
 */

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Check,
  Eye,
  HelpCircle,
  Loader2,
  Lock,
  Monitor,
  MoreHorizontal,
  PenTool,
  Redo2,
  Rocket,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
} from "lucide-react";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import {
  BTN,
  HEADING,
  Tip,
  cn,
  money,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import {
  SaveStatusBadge,
  type BuilderBarApi,
  type SaveState,
} from "./RehearsalStudioUI";

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

/** Everything the top bar needs to offer "Create invitation" / "Unlock". */
export type CreateInvitationApi = {
  templateId: string;
  owned: boolean | null;
  price?: number;
  unlockHref: string;
  onCreate: () => Promise<void>;
  /** The template already has an invitation, so the button says "Update". */
  isUpdate?: boolean;
  /** Unlocked through the plan rather than bought. */
  viaPlan?: boolean;
};

const HAIRLINE = "border-black/[0.08]";
const ICON_BTN =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-stone-500 transition hover:bg-orange-50 hover:text-orange-600 active:scale-95 disabled:pointer-events-none disabled:opacity-30 sm:size-9";

/* ========================================================================== */
/*  Small controls                                                            */
/* ========================================================================== */

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors motion-reduce:transition-none",
        checked ? "bg-orange-500" : "bg-stone-300",
        FOCUS,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/* ========================================================================== */
/*  Top bar                                                                   */
/* ========================================================================== */

export function RehearsalTopBar({
  title,
  saveState,
  savedAt,
  aiOpen,
  builderMode,
  guideUnread,
  builder,
  create,
  onBack,
  onSave,
  onDiscard,
  onToggleAi,
  onBuilderModeChange,
  onGuide,
}: {
  title: string;
  saveState: SaveState;
  savedAt: number | null;
  aiOpen: boolean;
  /** AI panel is open in Auto-builder mode. */
  builderMode: boolean;
  guideUnread: boolean;
  builder: BuilderBarApi;
  create: CreateInvitationApi;
  onBack: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onToggleAi: () => void;
  onBuilderModeChange: (on: boolean) => void;
  onGuide: () => void;
}) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const creatingRef = React.useRef(false);
  const moreRef = React.useRef<HTMLDivElement>(null);

  const devices = [
    ["desktop", Monitor],
    ["tablet", Tablet],
    ["mobile", Smartphone],
  ] as const;

  React.useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const handleCreate = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      await create.onCreate();
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const primary =
    create.owned === true ? (
      <Tip
        label={
          create.isUpdate
            ? "Save these changes to your invitation"
            : "Turn this rehearsal into your invitation"
        }
        side="bottom"
      >
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          aria-label={
            create.isUpdate ? "Update invitation" : "Create invitation"
          }
          className={cn(
            BTN,
            "h-11 gap-1.5 rounded-lg px-3 text-xs shadow-sm disabled:opacity-60 sm:h-9 sm:px-4 sm:text-sm",
            FOCUS,
          )}
        >
          {creating ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Rocket className="size-4" />
          )}
          <span className="max-sm:hidden">
            {creating ? (
              "Saving…"
            ) : (
              <>
                {create.isUpdate ? "Update" : "Create"}
                <span className="max-lg:hidden"> invitation</span>
              </>
            )}
          </span>
        </button>
      </Tip>
    ) : create.owned === false ? (
      <Tip label="Buy this template to publish your invitation" side="bottom">
        <Link
          href={create.unlockHref}
          aria-label="Unlock this template"
          className={cn(
            "inline-flex h-11 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:bg-neutral-800 active:scale-[0.98] sm:h-9 sm:px-4 sm:text-sm",
            FOCUS,
          )}
        >
          <Lock className="size-4 text-amber-300" />
          <span className="max-sm:hidden">
            Unlock
            {create.price && create.price > 0 ? (
              <span className="tabular-nums"> · {money(create.price)}</span>
            ) : null}
          </span>
        </Link>
      </Tip>
    ) : (
      <button
        type="button"
        disabled
        aria-label="Checking purchase"
        className={cn(
          BTN,
          "h-11 gap-1.5 rounded-lg px-3 text-xs opacity-60 sm:h-9",
          FOCUS,
        )}
      >
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        <span className="max-sm:hidden">Checking…</span>
      </button>
    );

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-1 border-b border-orange-100 bg-white/90 px-2 shadow-sm backdrop-blur-xl sm:gap-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        <Tip label="Back to templates" side="bottom">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to templates"
            className={cn(ICON_BTN, FOCUS)}
          >
            <ArrowLeft className="size-5" />
          </button>
        </Tip>
        <div className="hidden min-w-0 min-[430px]:block">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase leading-3 tracking-[0.08em] text-orange-600">
            Rehearsal
            {create.owned === true && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-px text-[9px] font-bold normal-case tracking-normal text-emerald-700 ring-1 ring-emerald-200">
                <Check className="size-2.5" />{" "}
                {create.viaPlan ? "In your plan" : "Purchased"}{" "}
              </span>
            )}
          </p>
          <h1
            className={cn(
              HEADING,
              "max-w-[8rem] truncate text-sm leading-4 text-[#2a1002] sm:max-w-xs sm:text-[15px]",
            )}
            title={title}
          >
            {title}
          </h1>
        </div>
        <div className="hidden items-center sm:flex">
          <button
            type="button"
            onClick={builder.undo}
            disabled={!builder.canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className={cn(ICON_BTN, FOCUS)}
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={builder.redo}
            disabled={!builder.canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            className={cn(ICON_BTN, FOCUS)}
          >
            <Redo2 className="size-4" />
          </button>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Preview device"
        className="hidden items-center gap-1 rounded-xl bg-black/[0.05] p-1 md:flex"
      >
        {devices.map(([d, Ic]) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={builder.device === d}
            aria-label={d}
            onClick={() => builder.setDevice(d)}
            className={cn(
              "relative rounded-lg p-1.5 transition-colors",
              builder.device === d
                ? "text-orange-600"
                : "text-stone-500 hover:text-[#2a1002]",
              FOCUS,
            )}
          >
            {builder.device === d && (
              <motion.span
                layoutId="rehearsal-device-pill"
                className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(28,20,16,0.12)]"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            <Ic className="relative size-4" />
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        <SaveStatusBadge state={saveState} savedAt={savedAt} />

        <Tip label="Preview" hint="Esc to exit" side="bottom">
          <button
            type="button"
            onClick={builder.startPreview}
            aria-label="Preview"
            className={cn(ICON_BTN, FOCUS)}
          >
            <Eye className="size-4" />
          </button>
        </Tip>

        {/* Builder mode: large screens inline, smaller screens inside "More" */}
        <label
          className={cn(
            "hidden h-9 cursor-pointer items-center gap-2 rounded-lg border bg-white px-2.5 text-xs font-semibold transition lg:flex",
            builderMode
              ? "border-orange-300 text-orange-700"
              : cn("text-stone-600 hover:border-orange-300", HAIRLINE),
          )}
        >
          <PenTool className="size-4" />
          Builder mode
          <Switch
            checked={builderMode}
            onChange={onBuilderModeChange}
            label="AI builder mode"
          />
        </label>

        <Tip label="Design ideas and auto-builder" side="bottom">
          <button
            type="button"
            onClick={onToggleAi}
            aria-pressed={aiOpen}
            aria-label="Toggle AI assistant"
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition active:scale-95 sm:h-9 sm:px-3",
              aiOpen
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : cn(
                    "bg-white text-stone-600 hover:border-orange-300 hover:text-orange-600",
                    HAIRLINE,
                  ),
              FOCUS,
            )}
          >
            <Bot className="size-4" />
            <span className="max-sm:hidden">AI help</span>
          </button>
        </Tip>

        <div className="hidden items-center gap-1.5 lg:flex">
          <Tip label="How it works" side="bottom">
            <button
              type="button"
              onClick={onGuide}
              aria-label="Open the guide"
              className={cn(ICON_BTN, "relative", FOCUS)}
            >
              <HelpCircle className="size-4" />
              {guideUnread && (
                <span
                  aria-hidden
                  className="absolute right-1 top-1 size-2 rounded-full bg-orange-500 ring-2 ring-white"
                />
              )}
            </button>
          </Tip>
          <Tip label="Not buying? Delete this draft" side="bottom">
            <button
              type="button"
              onClick={onDiscard}
              aria-label="Delete draft"
              className={cn(
                ICON_BTN,
                "hover:bg-red-50 hover:text-red-600",
                FOCUS,
              )}
            >
              <Trash2 className="size-4" />
            </button>
          </Tip>
        </div>

        {/* More menu (below lg) */}
        <div ref={moreRef} className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-label="More actions"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className={cn(ICON_BTN, "relative", FOCUS)}
          >
            <MoreHorizontal className="size-5" />
            {guideUnread && (
              <span
                aria-hidden
                className="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white"
              />
            )}
          </button>
          <AnimatePresence>
            {moreOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-black/[0.08]"
              >
                <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                    <PenTool className="size-4 text-orange-500" /> Builder mode
                  </span>
                  <Switch
                    checked={builderMode}
                    onChange={(v) => {
                      setMoreOpen(false);
                      onBuilderModeChange(v);
                    }}
                    label="AI builder mode"
                  />
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onGuide();
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-stone-700 hover:bg-orange-50",
                    FOCUS,
                  )}
                >
                  <HelpCircle className="size-4 text-stone-400" /> How it works
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onDiscard();
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50",
                    FOCUS,
                  )}
                >
                  <Trash2 className="size-4" /> Delete draft
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saveState === "saving"}
          aria-label="Save draft"
          className={cn(
            "inline-flex h-11 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:border-orange-300 hover:text-orange-600 active:scale-95 disabled:opacity-60 sm:h-9 sm:px-3",
            HAIRLINE,
            FOCUS,
          )}
        >
          {saveState === "saving" ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Save className="size-4" />
          )}
          <span className="max-sm:hidden">Save</span>
        </button>

        {primary}
      </div>
    </header>
  );
}
