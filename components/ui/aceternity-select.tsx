"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search } from "lucide-react";

export type SelectOption = { label: string; value: string };

interface SelectProps {
  value: string;
  onChange: (val: string) => void;
  /** Accepts plain strings OR { label, value } objects. */
  options: ReadonlyArray<string | SelectOption>;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
}

const MAX_VISIBLE = 150; // keeps huge lists (e.g. all lucide icons) fast

export function AceternitySelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchable = false,
  className = "",
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalized = useMemo<SelectOption[]>(
    () =>
      options.map((o) =>
        typeof o === "string" ? { label: o, value: o } : o,
      ),
    [options],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable) searchRef.current?.focus();
    if (!isOpen) setQuery("");
  }, [isOpen, searchable]);

  const selected = normalized.find((o) => o.value === value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? normalized.filter((o) => o.label.toLowerCase().includes(q))
      : normalized;
    return list.slice(0, MAX_VISIBLE);
  }, [normalized, query]);

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-60"
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            {searchable && (
              <div className="relative border-b border-slate-100 px-2 pb-2 pt-1">
                <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-2 text-xs outline-none focus:border-orange-400"
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-400 [&::-webkit-scrollbar]:w-1.5">
              {visible.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">No results</p>
              )}
              {visible.map((opt) => (
                <button
                  type="button"
                  key={opt.value || "__empty"}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-orange-50 ${value === opt.value ? "font-medium text-orange-600" : "text-slate-700"}`}
                >
                  {opt.label}
                  {value === opt.value && (
                    <Check className="h-4 w-4 text-orange-500" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}