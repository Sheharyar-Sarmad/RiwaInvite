import Link from "next/link";

export function TheDesigners() {
  return (
    <section id="designers" className="scroll-mt-28 w-full bg-[#fffafb] px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-600">The people behind the paper-less</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[#1c1410] sm:text-4xl">
          Designed by working invitation artists
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
          Every template on Riwainvite is authored by a practicing invitation designer — people who set type for real
          weddings and real events, not generated filler. They choose the palettes, the paper-feel textures and the
          rhythm of each layout; the platform only makes their craft interactive.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Craft first", "Layouts are composed like print: hierarchy, whitespace and typography before decoration."],
            ["Culturally fluent", "Nikkah, walima, mehndi and modern ceremonies — designed by people who attend them."],
            ["Alive, not static", "Designers hand us a living canvas: music, motion and RSVPs woven into their composition."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.06] shadow-sm">
              <h3 className="font-[family-name:var(--font-display)] text-base font-extrabold text-[#1c1410]">{title}</h3>
              <p className="mt-2 text-sm text-stone-600">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/craft" className="inline-flex h-11 items-center rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-5 text-sm font-semibold text-white">
            Meet the craft
          </Link>
          <Link href="/templates" className="inline-flex h-11 items-center rounded-xl border border-black/[0.08] bg-white px-5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            Browse their templates
          </Link>
        </div>
      </div>
    </section>
  );
}