"use client";

import { useEffect, useState } from "react";

export function LegalToc({ sections }: { sections: { id: string; title: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Legal sections" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                active === s.id ? "bg-orange-50 text-orange-700" : "text-stone-500 hover:bg-stone-100 hover:text-[#1c1410]"
              }`}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}