"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import useSWR from "swr";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Mail,
  Moon,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sun,
  Sunrise,
  Sunset,
  Trophy,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { FOCUS } from "@/components/user/navigation/UserSidebar";

export type DashboardUser = {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone_number?: string;
  created_at?: string;
};

type Overview = {
  stats: {
    totalInvitations: number;
    activeInvitations: number;
    totalRSVPs: number;
    totalGuests: number;
    rsvpsThisWeek: number;
    guestsThisWeek: number;
  };
  actionItems: { unclaimedCustomSlugs: number };
  recentInvitations: {
    id: string;
    title: string;
    status: string;
    slug: string | null;
    created_at: string;
    rsvp_count: number;
  }[];
  mostActiveInvitation: { id: string; title: string; rsvp_count: number } | null;
  recentRSVPs: {
    guest_name: string;
    attendance_status: string;
    number_of_guests: number;
    created_at: string;
    invitation_title: string;
  }[];
  planUsage: { max_simple_templates: number; max_premium_templates: number };
};

type Analytics = {
  rsvpTrend: { date: string; accepted: number; declined: number }[];
  guestBreakdown: { accepted: number; declined: number; pending: number };
  topInvitations: { title: string; total_rsvps: number }[];
  hourlyRSVPs: { time_of_day: string; count: number }[];
  totalPlusOnes: number;
};

type ActivityItem = {
  id: string;
  title: string;
  message: string;
  type: "notification" | "rsvp" | "order";
  created_at: string;
};

type Billing = {
  activeSubscription: {
    id: string;
    plan_name: string;
    price: number | string;
    status: string;
    expires_at: string;
  } | null;
  recentOrders: {
    id: string;
    provider_order_id: string;
    amount: number | string;
    order_type: string;
    status: string;
    created_at: string;
  }[];
  lifetimeSpend: number;
};

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;
type TabId = (typeof TABS)[number]["id"];

const EASE = [0.16, 1, 0.3, 1] as const;
const MAX_TILT = 5;
const VIEW = { once: true, amount: 0.15 } as const;
const STICKY_TOP = "top-2 sm:top-3";

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const money = (n: number | string) => `Rs ${Number(n || 0).toLocaleString()}`;

function timeAgo(d: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : fmtDate(d);
}

const titleCase = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/* -------------------------------------------------------------------------- */
/*  Tones: Deep Navy, Peach Glass, Vibrant Orange                             */
/* -------------------------------------------------------------------------- */

type Tone = "ember" | "paper" | "sun";

const TONE: Record<
  Tone,
  {
    bg: string;
    shell: string;
    light: string;
    muted: string;
    soft: string;
    row: string;
    icon: string;
    link: string;
    track: string;
  }
> = {
  ember: {
    bg: "radial-gradient(90% 70% at 100% 0%, rgba(249,115,22,0.18), transparent 60%), linear-gradient(160deg, #2d2a6e 0%, #1e293b 100%)",
    shell:
      "border-white/10 shadow-[0_24px_50px_-26px_rgba(15,23,42,0.85)] group-hover:shadow-[0_34px_60px_-26px_rgba(249,115,22,0.4)]",
    light: "rgba(255,255,255,0.08)",
    muted: "text-slate-300",
    soft: "text-slate-400",
    row: "bg-white/5 ring-1 ring-white/10 hover:bg-white/10",
    icon: "bg-white/10 text-orange-400 ring-1 ring-white/20",
    link: "text-orange-400 hover:text-orange-300",
    track: "bg-white/10",
  },
  paper: {
    bg: "radial-gradient(80% 60% at 0% 0%, rgba(255,255,255,0.95), transparent 60%), radial-gradient(70% 60% at 100% 100%, rgba(249,115,22,0.12), transparent 60%), linear-gradient(160deg, #fffaf4 0%, #fff3e6 100%)",
    shell:
      "border-orange-100 shadow-[0_18px_40px_-26px_rgba(154,52,18,0.2)] group-hover:shadow-[0_30px_55px_-26px_rgba(154,52,18,0.3)]",
    light: "rgba(255,255,255,0.8)",
    muted: "text-slate-600",
    soft: "text-slate-500",
    row: "bg-white/80 ring-1 ring-orange-50 hover:bg-white",
    icon: "bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30",
    link: "text-orange-600 hover:text-orange-700",
    track: "bg-orange-100",
  },
  sun: {
    bg: "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(190,60,0,0.14), transparent 60%), linear-gradient(135deg, #fb8a3c 0%, #fdac66 60%, #fcd34d 100%)",
    shell:
      "border-orange-400/30 shadow-[0_24px_50px_-26px_rgba(234,88,12,0.6)] group-hover:shadow-[0_34px_60px_-26px_rgba(234,88,12,0.8)]",
    light: "rgba(255,255,255,0.25)",
    muted: "text-white/90",
    soft: "text-white/80",
    row: "bg-white/20 ring-1 ring-white/30 hover:bg-white/30",
    icon: "bg-white/20 text-white ring-1 ring-white/40",
    link: "text-white underline-offset-4 hover:underline",
    track: "bg-white/20",
  },
};

const TONE_TEXT: Record<Tone, string> = {
  ember: "text-white",
  paper: "text-slate-900",
  sun: "text-white",
};

const Z = "[transform:translateZ(26px)]";
const Z_SM = "[transform:translateZ(14px)]";

/* ---------- NEW helpers ---------- */
const listV = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const itemV = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};

function Float({ children, amp = 8 }: { children: React.ReactNode; amp?: number }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      animate={reduce ? undefined : { y: [0, -amp, 0], rotate: [0, 0.6, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-orange-100/70 ring-1 ring-orange-200/50", className)}>
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

type RevealFrom = "up" | "left" | "right" | "scale";

function Reveal({
  children,
  className,
  delay = 0,
  from = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  from?: RevealFrom;
}) {
  const reduce = useReducedMotion() ?? false;
  const offset = { up: { y: 26 }, left: { x: -26 }, right: { x: 26 }, scale: { scale: 0.93 } }[from];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <Shimmer className={className} />;
}

/* -------------------------------------------------------------------------- */
/*  Components                                                                */
/* -------------------------------------------------------------------------- */

function useFinePointer() {
  const [fine, setFine] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

function TiltCard({
  tone,
  className,
  pad = "p-4 sm:p-5 lg:p-6",
  delay = 0,
  children,
}: {
  tone: Tone;
  className?: string;
  pad?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  const fine = useFinePointer();
  const tilt = fine && !reduce;
  const t = TONE[tone];

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(py, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);

  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const light = useMotionTemplate`radial-gradient(420px circle at ${gx}px ${gy}px, ${t.light}, transparent 65%)`;
  const edge = useMotionTemplate`radial-gradient(240px circle at ${gx}px ${gy}px, rgba(251,146,60,0.95), transparent 70%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx - 0.5);
    py.set(ny - 0.5);
    gx.set(nx * r.width);
    gy.set(ny * r.height);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
    gx.set(-400);
    gy.set(-400);
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={VIEW}
      whileHover={tilt ? { y: -4, transition: { duration: 0.35, ease: EASE } } : undefined}
      transition={{ duration: 0.7, delay, ease: EASE }}
      onPointerMove={tilt ? onMove : undefined}
      onPointerLeave={tilt ? onLeave : undefined}
      style={tilt ? { rotateX, rotateY, transformPerspective: 1200, transformStyle: "preserve-3d" } : undefined}
      className={cn("group relative min-w-0", className)}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] border transition-shadow duration-500",
          t.shell,
        )}
        style={{ backgroundImage: t.bg }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        {tilt && (
          <motion.div
            style={{ background: light }}
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        {tilt && (
          <motion.div
            aria-hidden
            style={{
              background: edge,
              padding: 1.5,
              WebkitMask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
              mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
              maskComposite: "exclude",
            }}
            className="absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </div>
      <div
        className={cn("relative flex h-full min-w-0 flex-col", pad, TONE_TEXT[tone])}
        style={tilt ? { transformStyle: "preserve-3d" } : undefined}
      >
        {children}
      </div>
    </motion.div>
  );
}

function CardHead({ tone, title, href, cta = "View all" }: { tone: Tone; title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <motion.span
          aria-hidden
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={VIEW}
          transition={{ duration: 0.6, ease: EASE }}
          className={cn(
            "h-1 w-6 shrink-0 origin-left rounded-full",
            tone === "ember" ? "bg-orange-400" : tone === "sun" ? "bg-white" : "bg-orange-500",
          )}
        />
        <div className="min-w-0 overflow-hidden pb-0.5">
          <motion.h3
            initial={{ y: "110%", opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={VIEW}
            transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
            className="truncate text-base font-bold tracking-tight font-[family-name:var(--font-display)] sm:text-lg"
          >
            {title}
          </motion.h3>
        </div>
      </div>
      {href && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEW}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="shrink-0"
        >
          <Link href={href} className={cn("rounded-md text-sm font-semibold transition", TONE[tone].link, FOCUS)}>
            {cta}
          </Link>
        </motion.div>
      )}
    </div>
  );
}

function Pic({ src, sizes, className, children }: { src: string; sizes: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("relative w-full shrink-0 overflow-hidden", className)}>
      <Image src={src} alt="" aria-hidden fill sizes={sizes} className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
      {children}
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv, inView]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <TiltCard tone="paper" className="rounded-3xl">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
          <RefreshCw className="size-5" />
        </div>
        <div>
          <p className="font-bold">This section didn’t load</p>
          <p className="mt-0.5 text-sm text-slate-700">Check your connection, then try again.</p>
        </div>
        <button
          onClick={onRetry}
          className={cn("rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 active:scale-[0.98]", FOCUS)}
        >
          Try again
        </button>
      </div>
    </TiltCard>
  );
}

function StatusChip({ status, dark }: { status: string; dark?: boolean }) {
  const map: Record<string, string> = {
    accepted: dark ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-500/15 text-emerald-700",
    declined: dark ? "bg-rose-400/20 text-rose-200" : "bg-rose-500/15 text-rose-700",
    pending: dark ? "bg-amber-300/20 text-amber-200" : "bg-amber-500/20 text-amber-800",
    published: dark ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-500/15 text-emerald-700",
    draft: dark ? "bg-white/15 text-orange-100" : "bg-slate-900/10 text-slate-700",
    completed: dark ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-500/15 text-emerald-700",
  };
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", map[status] ?? map.draft)}>
      {titleCase(status)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene3D                                                                   */
/* -------------------------------------------------------------------------- */

function Scene3D({ className }: { className?: string }) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: () => void = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
      camera.position.set(0, 0, 7);

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(3, 4, 5);
      scene.add(key);
      const glow = new THREE.PointLight(0xff8a3d, 45, 20);
      glow.position.set(-3, -1, 3);
      scene.add(glow);

      const group = new THREE.Group();
      scene.add(group);

      const gem = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15, 0),
        new THREE.MeshStandardMaterial({ color: 0xffb35a, roughness: 0.22, metalness: 0.45, flatShading: true }),
      );
      group.add(gem);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.9, 0.035, 12, 96),
        new THREE.MeshStandardMaterial({ color: 0xfff1e0, roughness: 0.3, metalness: 0.3 }),
      );
      ring.rotation.x = Math.PI / 2.6;
      group.add(ring);
      const orbit = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfbbf24, emissiveIntensity: 0.6 }),
        );
        const a = (i / 3) * Math.PI * 2;
        m.position.set(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9);
        orbit.add(m);
      }
      orbit.rotation.x = Math.PI / 2.6;
      group.add(orbit);

      const update = (t: number) => {
        gem.rotation.y = t * 0.6;
        gem.rotation.x = t * 0.25;
        orbit.rotation.y = -t * 0.5;
      };

      const pointer = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 2;
        target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };

      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (reduce) renderer.render(scene, camera);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();

      let visible = true;
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
      io.observe(host);

      const clock = new THREE.Clock();
      let raf = 0;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) return;
        const t = clock.getElapsedTime();
        pointer.x += (target.x - pointer.x) * 0.05;
        pointer.y += (target.y - pointer.y) * 0.05;
        group.rotation.y = pointer.x * 0.5;
        group.rotation.x = pointer.y * 0.3;
        group.position.y = Math.sin(t * 1.2) * 0.12;
        update(t);
        renderer.render(scene, camera);
      };

      if (reduce) {
        update(0);
        renderer.render(scene, camera);
      } else {
        window.addEventListener("pointermove", onMove, { passive: true });
        frame();
      }
      host.style.opacity = "1";

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        io.disconnect();
        scene.traverse((o) => {
          const m = o as import("three").Mesh;
          if (m.geometry) m.geometry.dispose();
          const mat = m.material as import("three").Material | import("three").Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [reduce]);

  return <div ref={hostRef} aria-hidden style={{ opacity: 0 }} className={cn("transition-opacity duration-700", className)} />;
}

/* -------------------------------------------------------------------------- */
/*  Activity Sheet                                                            */
/* -------------------------------------------------------------------------- */

const ACTIVITY_STYLE: Record<ActivityItem["type"], { icon: React.ElementType; cls: string }> = {
  notification: { icon: Bell, cls: "bg-gradient-to-br from-orange-500 to-amber-400" },
  rsvp: { icon: UserCheck, cls: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
  order: { icon: Receipt, cls: "bg-gradient-to-br from-rose-500 to-orange-500" },
};

const ACTIVITY_META: Record<ActivityItem["type"], { label: string; href: string; cta: string }> = {
  notification: { label: "Notification", href: "/dashboard/notifications", cta: "Open notifications" },
  rsvp: { label: "Guest reply", href: "/dashboard/rsvps", cta: "View RSVPs" },
  order: { label: "Payment", href: "/dashboard/billing", cta: "View billing" },
};

function ActivitySheet({ item, onClose }: { item: ActivityItem | null; onClose: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  const controls = useDragControls();

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2a0e04]/55 backdrop-blur-sm"
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-title"
            initial={{ opacity: 0, y: 70 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 70 }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            style={{ backgroundImage: TONE.paper.bg }}
            className="relative max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-orange-900/10 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-slate-900 shadow-[0_-20px_60px_-20px_rgba(154,52,18,0.6)] sm:max-w-md sm:rounded-[1.75rem] sm:pb-6"
          >
            <div
              onPointerDown={(e) => controls.start(e)}
              className="-mt-2 mb-2 flex h-6 cursor-grab touch-none items-center justify-center sm:hidden"
              aria-hidden
            >
              <span className="h-1.5 w-10 rounded-full bg-orange-900/20" />
            </div>

            <ActivitySheetBody item={item} onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ActivitySheetBody({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const s = ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.notification;
  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.notification;
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => closeRef.current?.focus(), []);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-lg", s.cls)}>
            <s.icon className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-orange-700">{meta.label}</p>
            <p className="flex items-center gap-1 text-xs text-slate-600">
              <Clock className="size-3" /> {timeAgo(item.created_at)}
            </p>
          </div>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-700 ring-1 ring-orange-900/10 transition hover:bg-white active:scale-95",
            FOCUS,
          )}
        >
          <X className="size-4" />
        </button>
      </div>

      <h4 id="activity-title" className="mt-4 text-xl font-extrabold tracking-tight font-[family-name:var(--font-display)]">
        {item.title}
      </h4>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-800">{item.message}</p>

      <div className="mt-4 rounded-2xl bg-white/70 px-3.5 py-3 text-xs text-slate-700 ring-1 ring-orange-900/10">
        {new Date(item.created_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}
      </div>

      <Link
        href={meta.href}
        onClick={onClose}
        className={cn(
          "mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.98]",
          FOCUS,
        )}
      >
        {meta.cta} <ArrowUpRight className="size-4" />
      </Link>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                      */
/* -------------------------------------------------------------------------- */

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
          <Link
            href="/dashboard/library"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-orange-300/60 bg-gradient-to-b from-orange-400 to-orange-600 px-5 py-3 text-sm font-semibold text-white",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_28px_-8px_rgba(249,115,22,0.9)]",
              FOCUS,
            )}
          >
            <Plus className="size-4" strokeWidth={2.5} />
            New invitation
          </Link>
        </motion.div>
      </motion.header>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          {/* 👇 FIXED: Removed Reveal wrapper so position:sticky works */}
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
        {/* 👇 FIXED: Removed Reveal wrapper so position:sticky works */}
        <ProfileCard user={user} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Profile data + sticky dock                                                */
/* -------------------------------------------------------------------------- */

type ProfileRow = { icon: React.ElementType; label: string; value: string; chip?: boolean };

function useProfile(user: DashboardUser) {
  const { data: billing } = useSWR<Billing>("/user/dashboard/billing", fetcher);
  const { data: overview } = useSWR<Overview>("/user/dashboard/overview", fetcher);

  const sub = billing?.activeSubscription;
  const planName = sub?.plan_name || "Free Tier";
  const isFree = !!billing && !sub;
  const fullName = `${user.first_name} ${user.last_name || ""}`.trim();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    : null;

  const rows = [
    { icon: ShieldCheck, label: "Plan", value: planName, chip: true },
    memberSince && { icon: CalendarDays, label: "Member since", value: memberSince },
    overview?.planUsage && {
      icon: LayoutTemplate,
      label: "Simple templates",
      value: String(overview.planUsage.max_simple_templates),
    },
    overview?.planUsage && {
      icon: Crown,
      label: "Premium templates",
      value: String(overview.planUsage.max_premium_templates),
    },
    user.phone_number && { icon: Phone, label: "Phone", value: user.phone_number },
  ].filter(Boolean) as ProfileRow[];

  return { planName, isFree, fullName, rows };
}

function DockShell({ children }: { children: React.ReactNode }) {
  const y = useMotionValue(0);
  React.useEffect(() => {
    const on = () => y.set(window.scrollY);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [y]);
  const blur = useTransform(y, [0, 180], [8, 30]);
  const alpha = useTransform(y, [0, 180], [0.7, 0.92]);
  const filter = useMotionTemplate`blur(${blur}px) saturate(1.6)`;
  const bg = useMotionTemplate`rgba(255,255,255,${alpha})`;
  return (
    <div className={cn("sticky z-30", STICKY_TOP)}>
      <motion.div
        style={{ backdropFilter: filter, WebkitBackdropFilter: filter, backgroundColor: bg }}
        className="overflow-hidden rounded-2xl border border-white/70 shadow-[inset_0_1px_0_#fff,0_18px_40px_-18px_rgba(154,52,18,0.6)] ring-1 ring-orange-200/70"
      >
        {children}
      </motion.div>
    </div>
  );
}

function DockTabs({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  return (
    <div role="tablist" aria-label="Dashboard sections" className="grid grid-cols-4 gap-1 p-1.5">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onTab(t.id)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2 text-[11px] font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm",
              FOCUS,
              active ? "text-white" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {active && (
              <motion.span
                layoutId="dash-tab"
                className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400 shadow-[0_0_24px_rgba(249,115,22,0.7),inset_0_1px_0_rgba(255,255,255,0.5)]"
                transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.7 }}
              />
            )}
            <motion.span whileTap={{ scale: 0.85 }} className="relative flex items-center gap-2">
              <Icon className="size-4" strokeWidth={active ? 2.25 : 1.75} />
              <span>{t.label}</span>
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}

function Dock({ user, tab, onTab }: { user: DashboardUser; tab: TabId; onTab: (t: TabId) => void }) {
  const [open, setOpen] = React.useState(false);
  const { planName, isFree, fullName, rows } = useProfile(user);

  return (
    <DockShell>
      <div className="border-b border-orange-100 xl:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", FOCUS)}
        >
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-md shadow-orange-500/30">
            {user.first_name.charAt(0).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-900">{fullName}</span>
            <span className="block truncate text-[11px] text-slate-600">{user.email}</span>
          </span>
          <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">
            {planName}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-slate-500 transition-transform duration-300", open && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <dl className="grid grid-cols-2 gap-2 px-3 pb-3">
                {rows
                  .filter((r) => !r.chip)
                  .map((r) => (
                    <div key={r.label} className="min-w-0 rounded-xl bg-orange-50 px-3 py-2 ring-1 ring-orange-200/60">
                      <dt className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <r.icon className="size-3.5 text-orange-600" strokeWidth={1.75} /> {r.label}
                      </dt>
                      <dd className="mt-0.5 truncate text-sm font-bold text-slate-900">{r.value}</dd>
                    </div>
                  ))}
                {isFree && (
                  <Link
                    href="/plans"
                    className={cn(
                      "col-span-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-3.5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/30 active:scale-[0.98]",
                      FOCUS,
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Crown className="size-4" /> Upgrade to Pro
                    </span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                )}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DockTabs tab={tab} onTab={onTab} />
    </DockShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Profile card                                                              */
/* -------------------------------------------------------------------------- */

function ProfileCard({ user }: { user: DashboardUser }) {
  const { isFree, fullName, rows } = useProfile(user);

  return (
    <div className={cn("hidden w-full xl:sticky xl:block", "xl:top-3")}>
      <TiltCard tone="ember" className="rounded-[1.75rem]" delay={0.1} pad="p-5 sm:p-6">
        <div className={cn("flex items-center gap-4", Z)}>
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-xl font-bold text-white shadow-lg shadow-orange-500/40">
            {user.first_name.charAt(0).toUpperCase()}
            <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#1e293b] bg-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold font-[family-name:var(--font-display)] text-white">{fullName}</h2>
            <p className={cn("truncate text-sm", TONE.ember.muted)} title={user.email}>
              {user.email}
            </p>
          </div>
        </div>

        <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <dl className={cn("space-y-3.5", Z_SM)}>
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
              <dt className={cn("flex items-center gap-2", TONE.ember.muted)}>
                <r.icon className="size-4 text-orange-400" strokeWidth={1.75} /> {r.label}
              </dt>
              <dd className="min-w-0 truncate text-white">
                {r.chip ? (
                  <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-md shadow-orange-500/30">
                    {r.value}
                  </span>
                ) : (
                  <span className="font-semibold">{r.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        {isFree && (
          <Link
            href="/plans"
            className={cn(
              "group/up mt-6 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110",
              Z,
              FOCUS,
            )}
          >
            <span className="flex items-center gap-2">
              <Crown className="size-4" /> Upgrade to Pro
            </span>
            <ArrowUpRight className="size-4 transition-transform group-hover/up:-translate-y-0.5 group-hover/up:translate-x-0.5" />
          </Link>
        )}
      </TiltCard>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Overview                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({
  tone,
  label,
  icon: Icon,
  delay,
  chip,
  children,
}: {
  tone: Tone;
  label: string;
  icon: React.ElementType;
  delay: number;
  chip?: string;
  children: React.ReactNode;
}) {
  return (
    <TiltCard tone={tone} delay={delay} className="h-full rounded-3xl" pad="p-3.5 sm:p-5">
      <div className={cn("mb-3 flex items-start justify-between gap-2 sm:mb-4", Z)}>
        <span className={cn("flex size-9 items-center justify-center rounded-xl sm:size-10", TONE[tone].icon)}>
          <Icon className="size-[18px] sm:size-5" strokeWidth={1.75} />
        </span>
        {chip && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold sm:text-[11px]",
              tone === "sun" ? "bg-white/25 text-white" : "bg-white/10 text-orange-400",
            )}
          >
            <TrendingUp className="size-3" />
            {chip}
          </span>
        )}
      </div>
      <div className={Z_SM}>
        <p className={cn("text-3xl font-extrabold tracking-tighter font-[family-name:var(--font-display)] sm:text-4xl", TONE_TEXT[tone])}>
          {children}
        </p>
        <p className={cn("mt-0.5 text-[13px] font-medium sm:text-sm", TONE[tone].muted)}>{label}</p>
      </div>
    </TiltCard>
  );
}

function OverviewTab() {
  const { data, error, mutate } = useSWR<Overview>("/user/dashboard/overview", fetcher);
  const reduce = useReducedMotion() ?? false;

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data) return <OverviewSkeleton />;

  const stats = {
    totalInvitations: data.stats?.totalInvitations ?? 0,
    activeInvitations: data.stats?.activeInvitations ?? 0,
    totalRSVPs: data.stats?.totalRSVPs ?? 0,
    totalGuests: data.stats?.totalGuests ?? 0,
    rsvpsThisWeek: data.stats?.rsvpsThisWeek ?? 0,
    guestsThisWeek: data.stats?.guestsThisWeek ?? 0,
  };
  const recentInvitations = data.recentInvitations ?? [];
  const recentRSVPs = data.recentRSVPs ?? [];
  const top = data.mostActiveInvitation ?? null;
  const slugs = data.actionItems?.unclaimedCustomSlugs ?? 0;
  const loop = recentRSVPs.length > 3 && !reduce;
  const feed = loop ? [...recentRSVPs, ...recentRSVPs] : recentRSVPs;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6 lg:auto-rows-[minmax(0,auto)]">
      <div className="col-span-1 lg:col-span-2">
        <Reveal delay={0} className="h-full">
          <StatCard tone="ember" label="Invitations" icon={Mail} delay={0} chip={stats.activeInvitations ? `${stats.activeInvitations} live` : undefined}>
            <CountUp value={stats.totalInvitations} />
          </StatCard>
        </Reveal>
      </div>
      <div className="col-span-1 lg:col-span-2">
        <Reveal delay={0.08} className="h-full">
          <StatCard tone="paper" label="Accepted RSVPs" icon={UserCheck} delay={0.06} chip={stats.rsvpsThisWeek ? `+${stats.rsvpsThisWeek}` : undefined}>
            <CountUp value={stats.totalRSVPs} />
          </StatCard>
        </Reveal>
      </div>
      <div className="col-span-2 lg:col-span-2">
        <Reveal delay={0.16} className="h-full">
          <StatCard tone="sun" label="Expected guests" icon={Users} delay={0.12} chip={stats.guestsThisWeek ? `+${stats.guestsThisWeek}` : undefined}>
            <CountUp value={stats.totalGuests} />
          </StatCard>
        </Reveal>
      </div>

      <div className="col-span-2 lg:col-span-4">
        <TiltCard tone="ember" delay={0.18} className="h-full rounded-[1.75rem]" pad="p-5 sm:p-7">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-x-1/3 inset-y-0 rounded-[inherit] opacity-70"
            style={{
              background:
                "linear-gradient(100deg, transparent 20%, rgba(249,115,22,0.28) 45%, rgba(251,191,36,0.2) 55%, transparent 80%)",
            }}
            animate={reduce ? undefined : { x: ["-20%", "40%", "-20%"] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <Reveal from="left" delay={0.15}>
            <div className={cn("relative flex items-center gap-5", Z)}>
              <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl sm:size-16", TONE.ember.icon)}>
                <Trophy className="size-7" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-semibold", TONE.ember.soft)}>Most active invitation</p>
                <p className="truncate text-2xl font-extrabold tracking-tighter text-white sm:text-4xl font-[family-name:var(--font-display)]" title={top?.title}>
                  {top ? top.title : "No replies yet"}
                </p>
                <p className={cn("mt-1 text-sm font-medium", TONE.ember.muted)}>
                  {top ? `${top.rsvp_count} guest replies and counting` : "Your top invitation shows here"}
                </p>
              </div>
              {top && (
                <span className="hidden text-5xl font-extrabold tracking-tighter text-orange-400 sm:block font-[family-name:var(--font-display)]">
                  <CountUp value={top.rsvp_count} />
                </span>
              )}
            </div>
          </Reveal>
        </TiltCard>
      </div>

      <div className="col-span-2 lg:col-span-2 lg:row-span-2">
        <TiltCard tone="ember" delay={0.2} className="h-full rounded-[1.75rem]">
          <CardHead tone="ember" title="Latest replies" href="/dashboard/rsvps" />
          {recentRSVPs.length === 0 ? (
            <Float>
              <Pic src="/why-rsvp.png" sizes="(max-width: 640px) 90vw, 400px" className="aspect-[4/3] rounded-2xl ring-1 ring-white/15">
                <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-[#431407]/90 px-3.5 py-3 backdrop-blur">
                  <p className="text-sm font-bold text-white">No replies yet</p>
                  <p className="text-xs text-orange-100/80">Share an invitation link and replies will appear here.</p>
                </div>
              </Pic>
            </Float>
          ) : (
            <Reveal from="up" delay={0.2}>
              <div
                className="relative h-[26rem] overflow-hidden lg:h-full lg:min-h-[26rem]"
                style={{ maskImage: "linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent)" }}
              >
                <motion.ul
                  className="space-y-2"
                  animate={loop ? { y: ["0%", "-50%"] } : undefined}
                  transition={loop ? { duration: recentRSVPs.length * 4, repeat: Infinity, ease: "linear" } : undefined}
                >
                  {feed.map((r, i) => {
                    const hue =
                      r.attendance_status === "accepted"
                        ? "from-emerald-400 to-emerald-600"
                        : r.attendance_status === "declined"
                          ? "from-rose-400 to-rose-600"
                          : "from-amber-400 to-orange-500";
                    return (
                      <li
                        key={`${r.guest_name}-${i}`}
                        aria-hidden={loop && i >= recentRSVPs.length}
                        className={cn("flex items-center gap-3 rounded-2xl p-3 transition", TONE.ember.row)}
                      >
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white", hue)}>
                          {r.guest_name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{r.guest_name}</p>
                          <p className={cn("truncate text-xs", TONE.ember.muted)}>
                            {r.invitation_title} · {r.number_of_guests} guest{r.number_of_guests === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusChip status={r.attendance_status} dark />
                          <span className={cn("text-[11px]", TONE.ember.soft)}>{timeAgo(r.created_at)}</span>
                        </div>
                      </li>
                    );
                  })}
                </motion.ul>
              </div>
            </Reveal>
          )}
        </TiltCard>
      </div>

      {slugs > 0 && (
        <div className="col-span-2 lg:col-span-4">
          <TiltCard tone="paper" delay={0.05} className="rounded-3xl" pad="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Float amp={5}>
                <Pic src="/why-slugs.png" sizes="(max-width: 640px) 90vw, 200px" className="aspect-[16/8] rounded-2xl ring-1 ring-orange-900/10 sm:aspect-[16/10] sm:w-44" />
              </Float>
              <Reveal from="right" className="min-w-0 flex-1">
                <div className={cn("", Z_SM)}>
                  <p className="flex items-center gap-2 font-bold">
                    <Link2 className="size-4 text-orange-600" />
                    {slugs} custom slug{slugs > 1 ? "s" : ""} ready to use
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">Pick an invitation and give it a link your guests will remember.</p>
                </div>
              </Reveal>
              <Reveal from="right" delay={0.1}>
                <Link href="/dashboard/invitations" className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 active:scale-[0.97] sm:py-2.5", FOCUS)}>
                  Choose invitation <ArrowUpRight className="size-4" />
                </Link>
              </Reveal>
            </div>
          </TiltCard>
        </div>
      )}

      <div className="col-span-2 lg:col-span-4">
        <TiltCard tone="paper" className="h-full rounded-3xl">
          <CardHead tone="paper" title="Recent invitations" href="/dashboard/invitations" />
          {recentInvitations.length === 0 ? (
            <Float>
              <Pic src="/why-builder.png" sizes="(max-width: 640px) 90vw, 640px" className="aspect-[4/3] rounded-2xl shadow-[0_20px_50px_-20px_rgba(249,115,22,0.6)] ring-1 ring-orange-900/10 sm:aspect-[16/8]">
                <div className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-2.5 rounded-xl bg-[#431407]/90 px-3.5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-white">Create your first invitation</p>
                  <Link href="/dashboard/library" className={cn("inline-flex items-center justify-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-orange-400", FOCUS)}>
                    Browse templates <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </Pic>
            </Float>
          ) : (
            <motion.ul variants={listV} initial="hidden" whileInView="show" viewport={VIEW} className="space-y-2.5">
              {recentInvitations.map((item) => (
                <motion.li key={item.id} variants={itemV} className={cn("flex items-center justify-between gap-3 rounded-2xl p-3 transition sm:p-3.5", TONE.paper.row)}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11", TONE.paper.icon)}>
                      <Mail className="size-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <h4 className="truncate font-bold">{item.title}</h4>
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        {item.slug ? `/invite/${item.slug}` : "No custom link"} · {fmtDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden text-right min-[420px]:block">
                      <p className="text-lg font-extrabold leading-none tracking-tighter">{item.rsvp_count}</p>
                      <p className="text-[11px] text-slate-600">guests</p>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </TiltCard>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
      <Shimmer className="h-32 lg:col-span-2 sm:h-40" />
      <Shimmer className="h-32 lg:col-span-2 sm:h-40" />
      <Shimmer className="col-span-2 h-32 sm:h-40 lg:col-span-2" />
      <Shimmer className="col-span-2 h-36 lg:col-span-4" />
      <Shimmer className="col-span-2 h-72 lg:col-span-2 lg:row-span-2 lg:h-auto" />
      <Shimmer className="col-span-2 h-64 lg:col-span-4" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Analytics                                                                 */
/* -------------------------------------------------------------------------- */

const DAY_PARTS = [
  { key: "Morning", icon: Sunrise },
  { key: "Afternoon", icon: Sun },
  { key: "Evening", icon: Sunset },
  { key: "Night", icon: Moon },
] as const;

function GlowDonut({ arcs }: { arcs: { key: string; color: string; pct: number; offset: number }[] }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible" role="img" aria-label="Guest response breakdown">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="11" />
      {arcs.map(
        (a, i) =>
          a.pct > 0 && (
            <motion.circle
              key={a.key}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={a.color}
              strokeWidth="11"
              strokeLinecap="round"
              pathLength={100}
              strokeDashoffset={-a.offset}
              style={{ filter: `drop-shadow(0 0 7px ${a.color})` }}
              initial={{ strokeDasharray: "0 100" }}
              whileInView={{ strokeDasharray: `${Math.max(a.pct - 2, 0.1)} ${100 - Math.max(a.pct - 2, 0.1)}` }}
              viewport={VIEW}
              transition={{ duration: 1.3, delay: i * 0.15, ease: EASE }}
            />
          ),
      )}
    </svg>
  );
}

function TrendBars({ trend, maxV }: { trend: { date: string; accepted: number; declined: number }[]; maxV: number }) {
  const [hover, setHover] = React.useState<number | null>(null);
  return (
    <div className="relative flex h-44 items-end gap-[3px] sm:gap-1.5" onPointerLeave={() => setHover(null)}>
      {trend.map((d, i) => {
        const sum = d.accepted + d.declined;
        return (
          <div
            key={`${d.date}-${i}`}
            onPointerEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            tabIndex={0}
            className="relative flex h-full min-w-0 flex-1 flex-col justify-end outline-none"
          >
            <AnimatePresence>
              {hover === i && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#0f172a] px-3 py-2 text-xs text-white shadow-xl ring-1 ring-white/10"
                >
                  <p className="font-bold">{d.date}</p>
                  <p className="text-emerald-300">{d.accepted} accepted</p>
                  <p className="text-rose-300">{d.declined} declined</p>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-t-xl transition-[filter,box-shadow] duration-200",
                hover === i && "brightness-110 shadow-[0_0_18px_rgba(249,115,22,0.55)]",
                hover !== null && hover !== i && "opacity-50",
              )}
              initial={{ height: 0 }}
              whileInView={{ height: `${Math.max((sum / maxV) * 100, 6)}%` }}
              viewport={VIEW}
              transition={{ duration: 0.8, delay: Math.min(i, 30) * 0.015, ease: EASE }}
            >
              <div className="bg-gradient-to-b from-rose-300 to-rose-400" style={{ flex: d.declined }} />
              <div className="bg-gradient-to-b from-emerald-400 to-emerald-600" style={{ flex: d.accepted }} />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

function GlowBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full", TONE.sun.track)}>
      <motion.div
        className="relative h-full rounded-full bg-gradient-to-r from-white via-amber-100 to-white shadow-[0_0_16px_rgba(255,255,255,0.95)]"
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={VIEW}
        transition={{ duration: 1.1, delay, ease: EASE }}
      >
        <motion.span
          aria-hidden
          className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-orange-300/70 to-transparent"
          animate={{ x: ["-100%", "400%"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: delay + 1 }}
        />
      </motion.div>
    </div>
  );
}

function AnalyticsTab() {
  const { data, error, mutate } = useSWR<Analytics>("/user/dashboard/analytics", fetcher);

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data) {
    return (
      <div className="space-y-3.5 sm:space-y-5">
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const b = data.guestBreakdown ?? { accepted: 0, declined: 0, pending: 0 };
  const total = b.accepted + b.declined + b.pending;
  const rate = total ? Math.round(((b.accepted + b.declined) / total) * 100) : 0;

  const segments = [
    { key: "accepted", label: "Accepted", value: b.accepted, color: "#34d399" },
    { key: "declined", label: "Declined", value: b.declined, color: "#fb7185" },
    { key: "pending", label: "Pending", value: b.pending, color: "#fed7aa" },
  ];
  let offset = 0;
  const arcs = segments.map((s) => {
    const pct = total ? (s.value / total) * 100 : 0;
    const arc = { ...s, pct, offset };
    offset += pct;
    return arc;
  });

  const trend = data.rsvpTrend ?? [];
  const maxV = Math.max(1, ...trend.map((d) => d.accepted + d.declined));

  const top = data.topInvitations ?? [];
  const topMax = Math.max(1, ...top.map((t) => t.total_rsvps));

  const hours = DAY_PARTS.map((p) => ({
    ...p,
    count: data.hourlyRSVPs?.find((h) => h.time_of_day === p.key)?.count ?? 0,
  }));
  const hoursMax = Math.max(1, ...hours.map((h) => h.count));

  return (
    <div className="space-y-3.5 sm:space-y-5">
      <TiltCard tone="ember" className="rounded-[1.75rem]">
        <CardHead tone="ember" title="Guest responses" href="/dashboard/rsvps" cta="Manage" />
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <div className={cn("relative size-44 shrink-0 sm:size-52", Z)}>
            <GlowDonut arcs={arcs} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-white tracking-tighter">
                <CountUp value={total} />
              </span>
              <span className={cn("text-xs font-medium", TONE.ember.muted)}>guests invited</span>
            </div>
          </div>

          <Reveal from="right" className="w-full min-w-0 flex-1">
            <div className={cn("space-y-4", Z_SM)}>
              {segments.map((s, i) => {
                const pct = total ? Math.round((s.value / total) * 100) : 0;
                return (
                  <Reveal key={s.key} delay={i * 0.1}>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-semibold text-white">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </span>
                        <span className={TONE.ember.muted}>
                          <span className="font-bold text-white">{s.value}</span> · {pct}%
                        </span>
                      </div>
                      <div className={cn("h-2 overflow-hidden rounded-full", TONE.ember.track)}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: s.color }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={VIEW}
                          transition={{ duration: 1, ease: EASE }}
                        />
                      </div>
                    </div>
                  </Reveal>
                );
              })}
              <Reveal from="scale" delay={0.3}>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className={cn("rounded-xl px-3.5 py-3", TONE.ember.row)}>
                    <p className={cn("text-xs", TONE.ember.muted)}>Response rate</p>
                    <p className="text-xl font-extrabold text-orange-400">{rate}%</p>
                  </div>
                  <div className={cn("rounded-xl px-3.5 py-3", TONE.ember.row)}>
                    <p className={cn("text-xs", TONE.ember.muted)}>Plus-ones</p>
                    <p className="text-xl font-extrabold text-orange-400">{data.totalPlusOnes ?? 0}</p>
                  </div>
                </div>
              </Reveal>
            </div>
          </Reveal>
        </div>
        {total === 0 && (
          <p className={cn("mt-4 text-center text-sm", TONE.ember.muted)}>
            No responses yet. Share an invitation to start collecting RSVPs.
          </p>
        )}
      </TiltCard>

      <TiltCard tone="paper" delay={0.04} className="rounded-3xl">
        <CardHead tone="paper" title="Replies in the last 30 days" />
        {trend.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Float>
              <Pic
                src="/why-builder.png"
                sizes="(max-width: 640px) 90vw, 640px"
                className="aspect-[16/7] rounded-2xl ring-1 ring-orange-900/10"
              />
            </Float>
            <p className="text-sm text-slate-700">Daily replies will chart here once guests respond.</p>
          </div>
        ) : (
          <>
            <TrendBars trend={trend} maxV={maxV} />
            <Reveal delay={0.3}>
              <div className="mt-2 flex justify-between gap-2 text-[11px] font-medium text-slate-700 sm:text-xs">
                <span>{trend[0].date}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" /> Accepted
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-400" /> Declined
                  </span>
                </span>
                <span>{trend[trend.length - 1].date}</span>
              </div>
            </Reveal>
          </>
        )}
      </TiltCard>

      <div className="grid gap-3.5 sm:gap-5 md:grid-cols-2">
        <TiltCard tone="sun" delay={0.04} className="rounded-3xl">
          <CardHead tone="sun" title="Top invitations" />
          {top.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/90">Your most-answered invitations will rank here.</p>
          ) : (
            <ol className="space-y-4">
              {top.map((t, i) => (
                <li key={`${t.title}-${i}`}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-bold text-white">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs">
                        {i + 1}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </span>
                    <span className="shrink-0 font-bold text-white">{t.total_rsvps}</span>
                  </div>
                  <GlowBar pct={(t.total_rsvps / topMax) * 100} delay={i * 0.06} />
                </li>
              ))}
            </ol>
          )}
        </TiltCard>

        <TiltCard tone="ember" delay={0.08} className="rounded-3xl">
          <CardHead tone="ember" title="When guests reply" />
          <div className="grid h-40 grid-cols-4 items-end gap-2.5">
            {hours.map((h, i) => (
              <div key={h.key} className="flex h-full flex-col items-center justify-end gap-2">
                <Reveal from="scale" delay={i * 0.08}>
                  <span className="text-xs font-bold text-orange-400">{h.count}</span>
                </Reveal>
                <motion.div
                  className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-amber-300"
                  initial={{ height: 0 }}
                  whileInView={{ height: `${Math.max((h.count / hoursMax) * 62, 6)}%` }}
                  viewport={VIEW}
                  transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }}
                />
                <span className={cn("flex flex-col items-center gap-0.5 text-[11px]", TONE.ember.muted)}>
                  <h.icon className="size-3.5" />
                  {h.key}
                </span>
              </div>
            ))}
          </div>
        </TiltCard>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Activity                                                                  */
/* -------------------------------------------------------------------------- */

function ActivityTab() {
  const { data, error, mutate } = useSWR<ActivityItem[]>("/user/dashboard/activity", fetcher);
  const [selected, setSelected] = React.useState<ActivityItem | null>(null);
  const close = React.useCallback(() => setSelected(null), []);

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <>
      <TiltCard tone="paper" className="rounded-[1.75rem]" pad="p-3.5 sm:p-5 lg:p-6">
        <CardHead tone="paper" title="Activity timeline" href="/dashboard/notifications" cta="All" />
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Float>
              <Pic
                src="/why-rsvp.png"
                sizes="(max-width: 640px) 90vw, 640px"
                className="aspect-[16/7] rounded-2xl ring-1 ring-orange-900/10"
              />
            </Float>
            <p className="text-sm text-slate-700">Nothing yet. Replies, payments and updates will show up here.</p>
          </div>
        ) : (
          <motion.ol
            variants={listV}
            initial="hidden"
            whileInView="show"
            viewport={VIEW}
            className="relative space-y-3 before:absolute before:inset-y-2 before:left-[18px] before:w-px before:-translate-x-1/2 before:bg-gradient-to-b before:from-orange-400/60 before:via-orange-300/40 before:to-transparent sm:space-y-4 sm:before:left-5"
          >
            {data.map((item, i) => {
              const s = ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.notification;
              return (
                <motion.li
                  key={`${item.type}-${item.id}`}
                  variants={itemV}
                  className="relative flex items-start gap-3 sm:gap-3.5"
                >
                  <span
                    className={cn(
                      "z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-[#ffd9b8] sm:size-10",
                      s.cls,
                    )}
                  >
                    <s.icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <button
                    onClick={() => setSelected(item)}
                    aria-label={`Open ${item.title}`}
                    className={cn(
                      "group/item min-w-0 flex-1 rounded-2xl p-3 text-left transition active:scale-[0.99]",
                      TONE.paper.row,
                      FOCUS,
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-bold">{item.title}</h4>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-slate-600">
                        <Clock className="size-3" /> {timeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{item.message}</p>
                    <span className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-orange-700">
                      Details
                      <ChevronRight className="size-3.5 transition-transform group-hover/item:translate-x-0.5" />
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </TiltCard>
      <ActivitySheet item={selected} onClose={close} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Billing                                                                   */
/* -------------------------------------------------------------------------- */

function BillingTab() {
  const { data, error, mutate } = useSWR<Billing>("/user/dashboard/billing", fetcher);

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data)
    return (
      <div className="space-y-3.5 sm:space-y-5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );

  const sub = data.activeSubscription;
  const orders = data.recentOrders ?? [];

  return (
    <div className="space-y-3.5 sm:space-y-5">
      <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-5">
        <TiltCard tone="sun" className="rounded-3xl">
          <Scene3D className="pointer-events-none absolute -right-1 -top-1 size-24 sm:size-28" />
          <div className={cn("flex items-center gap-2 text-sm font-semibold", TONE.sun.muted)}>
            <ShieldCheck className="size-4" /> Current plan
          </div>
          <Reveal delay={0.1}>
            <p className={cn("mt-2 text-3xl font-extrabold font-[family-name:var(--font-display)] text-white tracking-tighter", Z)}>
              {sub?.plan_name || "Free Tier"}
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className={cn("mt-1 text-sm", TONE.sun.muted)}>
              {sub ? (
                <>
                  {money(sub.price)} · renews {fmtDate(sub.expires_at)}
                </>
              ) : (
                "Upgrade whenever your event grows."
              )}
            </div>
          </Reveal>
          {!sub && (
            <Reveal from="up" delay={0.25}>
              <Link
                href="/plans"
                className={cn(
                  "mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-orange-600 shadow-lg shadow-orange-900/20 transition hover:bg-orange-50 active:scale-[0.98]",
                  Z_SM,
                  FOCUS,
                )}
              >
                <Crown className="size-4" /> Upgrade to Pro
              </Link>
            </Reveal>
          )}
        </TiltCard>

        <TiltCard tone="ember" delay={0.08} className="rounded-3xl">
          <div className={cn("flex items-center gap-2 text-sm font-semibold", TONE.ember.muted)}>
            <Wallet className="size-4 text-orange-400" /> Lifetime spend
          </div>
          <Reveal from="scale">
            <p className={cn("mt-2 text-3xl font-extrabold font-[family-name:var(--font-display)] text-white tracking-tighter", Z)}>
              {money(data.lifetimeSpend ?? 0)}
            </p>
          </Reveal>
          <p className={cn("mt-1 text-sm", TONE.ember.muted)}>
            Across {orders.length} completed order{orders.length === 1 ? "" : "s"}
          </p>
        </TiltCard>
      </div>

      {!sub && (
        <TiltCard tone="ember" delay={0.04} className="rounded-3xl" pad="p-3 sm:p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <Float amp={5}>
              <Pic
                src="/why-plans.png"
                sizes="(max-width: 640px) 90vw, 220px"
                className="aspect-[16/8] rounded-2xl ring-1 ring-white/15 sm:aspect-[16/10] sm:w-48"
              />
            </Float>
            <div className={cn("min-w-0 flex-1", Z_SM)}>
              <p className="font-bold text-white">Pay for the size of your event</p>
              <p className={cn("mt-0.5 text-sm", TONE.ember.muted)}>
                Pro unlocks premium templates and room for bigger guest lists.
              </p>
            </div>
            <Reveal from="up" delay={0.25}>
              <Link
                href="/plans"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110 active:scale-[0.98] sm:py-2.5",
                  FOCUS,
                )}
              >
                See plans <ArrowUpRight className="size-4" />
              </Link>
            </Reveal>
          </div>
        </TiltCard>
      )}

      <TiltCard tone="paper" className="rounded-3xl">
        <CardHead tone="paper" title="Payment history" href="/dashboard/billing" cta="Full billing" />
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className={cn("flex size-11 items-center justify-center rounded-2xl", TONE.paper.icon)}>
              <CreditCard className="size-5" />
            </span>
            <p className="text-sm text-slate-700">No payments yet. Completed orders will be listed here.</p>
          </div>
        ) : (
          <motion.ul variants={listV} initial="hidden" whileInView="show" viewport={VIEW} className="space-y-2">
            {orders.map((o, i) => (
              <motion.li
                key={o.id}
                variants={itemV}
                className={cn("flex items-center justify-between gap-3 rounded-2xl p-3 transition sm:p-3.5", TONE.paper.row)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25">
                    <Receipt className="size-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{titleCase(o.order_type || "Order")}</p>
                    <p className="truncate text-xs text-slate-600">
                      {fmtDate(o.created_at)}
                      {o.provider_order_id ? ` · ${o.provider_order_id}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-extrabold tracking-tighter">{money(o.amount)}</span>
                  <StatusChip status={o.status} />
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </TiltCard>
    </div>
  );
}WWW