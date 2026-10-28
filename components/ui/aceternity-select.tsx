"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";

export type SelectOption = string | { value: string; label: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

const norm = (o: SelectOption) => (typeof o === "string" ? { value: o, label: o } : o);

export function AceternitySelect({ value, onChange, options, placeholder = "Select…", searchable, className = "", disabled, ...rest }: Props) {
  const showSearch = searchable ?? options.length > 10; // long lists get a search box automatically
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const btn = React.useRef<HTMLButtonElement>(null);
  const menu = React.useRef<HTMLDivElement>(null);

  const items = React.useMemo(() => options.map(norm).filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const current = options.map(norm).find((o) => o.value === value);

  const openMenu = () => {
    if (disabled) return;
    setRect(btn.current?.getBoundingClientRect() ?? null);
    setQ("");
    setActive(Math.max(0, items.findIndex((i) => i.value === value)));
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (menu.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const reposition = () => setRect(btn.current?.getBoundingClientRect() ?? null);
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    btn.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && items[active]) { e.preventDefault(); choose(items[active].value); }
  };

  const openUp = rect ? window.innerHeight - rect.bottom < 260 && rect.top > 260 : false;

  return (
    <div className={`relative ${className}`} onKeyDown={onKey}>
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={rest["aria-label"]}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white/80 px-3 text-left text-sm text-stone-800 shadow-sm outline-none transition hover:border-orange-300 focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-50"
      >
        <span className={`truncate ${current ? "" : "text-stone-400"}`}>{current?.label ?? placeholder}</span>
        <ChevronDown className={`size-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && rect && (
              <motion.div
                ref={menu}
                role="listbox"
                initial={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "fixed",
                  left: rect.left,
                  width: Math.max(rect.width, 160),
                  zIndex: 1000,
                  ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
                }}
                className="overflow-hidden rounded-xl border border-stone-200 bg-white/95 shadow-xl shadow-orange-900/10 backdrop-blur-md"
              >
                {showSearch && (
                  <div className="flex items-center gap-2 border-b border-stone-100 px-3">
                    <Search className="size-3.5 text-stone-400" />
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => { setQ(e.target.value); setActive(0); }}
                      placeholder="Search…"
                      className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                    />
                  </div>
                )}
                <div className="max-h-60 overflow-y-auto p-1">
                  {items.length === 0 && <div className="px-3 py-2 text-sm text-stone-400">No matches</div>}
                  {items.map((o, i) => (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={o.value === value}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(o.value)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                        i === active ? "bg-orange-50 text-orange-700" : "text-stone-700"
                      }`}
                    >
                      <span className="truncate">{o.label}</span>
                      {o.value === value && <Check className="size-3.5 text-orange-500" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

export default AceternitySelect;