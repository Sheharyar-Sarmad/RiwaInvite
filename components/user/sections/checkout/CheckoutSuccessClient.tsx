"use client";

/**
 * npm i three gsap && npm i -D @types/three
 * (framer-motion is no longer needed in this file)
 *
 * Same palette, same emerald check badge, same card.
 * Three.js: floating orange / amber / emerald crystals behind the card, and a
 * 3D confetti burst + shock rings in front of it when the badge lands.
 * GSAP: one orchestrated entrance timeline.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { ArrowRight, Copy, Check, ShieldCheck, Sparkles } from "lucide-react";

const COLORS = [
  "#f97316",
  "#fb923c",
  "#fbbf24",
  "#10b981",
  "#34d399",
  "#ffffff",
];

function makeStage(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  const light = new THREE.DirectionalLight(0xffffff, 1.6);
  light.position.set(200, 300, 400);
  scene.add(light);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1500, 1500); // 1 unit = 1 css px
  const size = (w: number, h: number) => {
    renderer.setSize(w, h, false);
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
  };
  const dispose = () => {
    scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.());
    env.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
  return { renderer, scene, camera, size, dispose };
}

export function CheckoutSuccessClient({ orderId }: { orderId: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bgCanvas = useRef<HTMLCanvasElement>(null);
  const fxCanvas = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const mask =
    "radial-gradient(260px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";
  const shortId =
    orderId.length > 18
      ? `${orderId.slice(0, 8)}…${orderId.slice(-6)}`
      : orderId;

  useEffect(() => {
    const root = rootRef.current!;
    const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const bg = makeStage(bgCanvas.current!);
    const fx = makeStage(fxCanvas.current!);
    let W = 1,
      H = 1;
    const resize = () => {
      W = root.clientWidth;
      H = root.clientHeight;
      bg.size(W, H);
      fx.size(W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    /* ---------- background crystals (behind the card) ---------- */
    const crystals = new THREE.Group();
    bg.scene.add(crystals);
    const geos = [
      new THREE.OctahedronGeometry(1),
      new THREE.IcosahedronGeometry(1),
      new THREE.TetrahedronGeometry(1.2),
    ];
    const hexes = [0xf97316, 0xfb923c, 0xfbbf24, 0x34d399, 0xfbbf24, 0xf97316];
    const seeded = (n: number) => {
      const x = Math.sin(n * 91.7) * 10000;
      return x - Math.floor(x);
    };
    const items = Array.from({ length: 14 }, (_, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: hexes[i % hexes.length],
        metalness: 0.15,
        roughness: 0.18,
        transparent: true,
        opacity: 0.6,
        flatShading: true,
      });
      const m = new THREE.Mesh(geos[i % 3], mat);
      const s = 18 + seeded(i + 3) * 42;
      m.scale.setScalar(s);
      const side = i % 2 ? 1 : -1; // keep them toward the edges, away from the card
      m.userData = {
        bx: side * (0.3 + seeded(i + 9) * 0.2),
        by: (seeded(i + 21) - 0.5) * 0.9,
        depth: 0.3 + seeded(i + 5),
        sp: 0.2 + seeded(i + 11) * 0.5,
        ph: seeded(i + 1) * 6.28,
        rs: new THREE.Vector3(
          seeded(i + 2),
          seeded(i + 4),
          seeded(i + 6),
        ).multiplyScalar(0.6),
        s,
      };
      crystals.add(m);
      return m;
    });

    /* ---------- confetti + shock rings (in front of the card) ---------- */
    const N = 80;
    const confetti = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.5, 0.08),
      new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 }),
      N,
    );
    const cols = COLORS.map((c) => new THREE.Color(c));
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    const P = Array.from({ length: N }, () => new THREE.Vector3());
    const V = Array.from({ length: N }, () => new THREE.Vector3());
    const R = Array.from({ length: N }, () => new THREE.Vector3());
    const S = Array.from({ length: N }, () => 8);
    for (let i = 0; i < N; i++) {
      confetti.setColorAt(i, cols[i % cols.length]);
      confetti.setMatrixAt(i, hide);
    }
    fx.scene.add(confetti);

    const rings = [0, 1].map(() => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.97, 1, 96),
        new THREE.MeshBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      fx.scene.add(m);
      return m;
    });

    let t0 = -1;
    let origin = new THREE.Vector3();
    const burst = () => {
      const r = q<HTMLElement>("[data-badge]").getBoundingClientRect();
      const rr = root.getBoundingClientRect();
      origin.set(
        r.left - rr.left + r.width / 2 - W / 2,
        H / 2 - (r.top - rr.top + r.height / 2),
        50,
      );
      t0 = 0;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + seeded(i) * 0.4;
        const sp = 260 + seeded(i + 40) * 560;
        P[i].copy(origin);
        V[i].set(
          Math.cos(a) * sp,
          Math.sin(a) * sp + 320,
          (seeded(i + 7) - 0.5) * 300,
        );
        R[i].set(seeded(i + 1) * 12, seeded(i + 2) * 12, seeded(i + 3) * 12);
        S[i] = 7 + seeded(i + 9) * 9;
      }
      rings.forEach((m, k) => {
        m.position.copy(origin);
        gsap.fromTo(
          m.scale,
          { x: 60, y: 60 },
          { x: 260, y: 260, duration: 1.8, delay: k * 0.3, ease: "power2.out" },
        );
        gsap.fromTo(
          m.material,
          { opacity: 0.7 },
          { opacity: 0, duration: 1.8, delay: k * 0.3, ease: "power2.out" },
        );
      });
    };

    /* ---------- pointer (cursor reveal, card tilt, crystal parallax) ---------- */
    const par = { x: 0, y: 0 };
    const tiltEl = q<HTMLElement>("[data-tilt]");
    const rotY = gsap.quickTo(tiltEl, "rotationY", {
      duration: 0.8,
      ease: "power3.out",
    });
    const rotX = gsap.quickTo(tiltEl, "rotationX", {
      duration: 0.8,
      ease: "power3.out",
    });
    const glX = gsap.quickTo(tiltEl, "--gx", {
      duration: 0.6,
      ease: "power3.out",
    });
    const glY = gsap.quickTo(tiltEl, "--gy", {
      duration: 0.6,
      ease: "power3.out",
    });
    let pr = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      cancelAnimationFrame(pr);
      pr = requestAnimationFrame(() => {
        root.style.setProperty("--mx", `${e.clientX}px`);
        root.style.setProperty("--my", `${e.clientY}px`);
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        par.x = nx;
        par.y = ny;
        if (!reduce) {
          rotY(nx * 8);
          rotX(-ny * 6);
          glX(nx * 100 + 50);
          glY(ny * 100 + 50);
        }
      });
    };
    const onLeave = () => {
      par.x = 0;
      par.y = 0;
      rotY(0);
      rotX(0);
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    /* ---------- render loop ---------- */
    const clock = new THREE.Clock();
    const d = new THREE.Object3D();
    let raf = 0;
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      items.forEach((m) => {
        const u = m.userData;
        m.position.set(
          u.bx * W - par.x * 50 * u.depth,
          u.by * H +
            Math.sin(t * u.sp + u.ph) * 26 * u.depth -
            par.y * 40 * u.depth,
          -100 * u.depth,
        );
        m.rotation.x += u.rs.x * dt;
        m.rotation.y += u.rs.y * dt;
        m.rotation.z += u.rs.z * dt;
      });
      if (t0 >= 0) {
        t0 += dt;
        const life = Math.max(0, 1 - t0 / 2.8);
        for (let i = 0; i < N; i++) {
          V[i].y -= 1300 * dt;
          V[i].multiplyScalar(1 - 0.6 * dt);
          P[i].addScaledVector(V[i], dt);
          d.position.copy(P[i]);
          d.rotation.set(R[i].x * t0, R[i].y * t0, R[i].z * t0);
          d.scale.setScalar(S[i] * Math.min(1, life * 2.5));
          d.updateMatrix();
          confetti.setMatrixAt(i, d.matrix);
        }
        confetti.instanceMatrix.needsUpdate = true;
        if (t0 > 2.8) {
          t0 = -1;
          for (let i = 0; i < N; i++) confetti.setMatrixAt(i, hide);
          confetti.instanceMatrix.needsUpdate = true;
        }
      }
      bg.renderer.render(bg.scene, bg.camera);
      fx.renderer.render(fx.scene, fx.camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    /* ---------- GSAP entrance ---------- */
    const ctx = gsap.context(() => {
      const path = q<SVGPathElement>("[data-check]");
      if (reduce) {
        gsap.set("[data-card]", { autoAlpha: 1 });
        return;
      }

      gsap.set("[data-rise]", { autoAlpha: 0, y: 22, filter: "blur(6px)" });
      gsap.set("[data-card]", { autoAlpha: 0 });
      gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set("[data-badge]", { scale: 0, rotation: -90 });
      gsap.set("[data-crystals]", { autoAlpha: 0 });
      crystals.scale.setScalar(0.001);

      // ambient loops
      gsap.to("[data-blob='a']", {
        x: 80,
        y: 40,
        scale: 1.15,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to("[data-blob='b']", {
        x: -70,
        y: -50,
        scale: 1.2,
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to("[data-blob='c']", {
        scale: 1.2,
        opacity: 0.8,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to("[data-floor]", {
        backgroundPositionY: "64px",
        duration: 3,
        repeat: -1,
        ease: "none",
      });
      gsap.to("[data-edge]", {
        rotation: 360,
        duration: 7,
        repeat: -1,
        ease: "none",
      });
      gsap.to("[data-shimmer]", {
        x: "450%",
        duration: 2.2,
        repeat: -1,
        repeatDelay: 1.8,
        ease: "power1.inOut",
      });

      const tl = gsap.timeline();
      tl.to(
        crystals.scale,
        { x: 1, y: 1, z: 1, duration: 2.2, ease: "expo.out" },
        0,
      )
        .fromTo(
          "[data-card]",
          {
            autoAlpha: 0,
            y: 60,
            rotationX: 18,
            scale: 0.94,
            transformPerspective: 1400,
          },
          {
            autoAlpha: 1,
            y: 0,
            rotationX: 0,
            scale: 1,
            duration: 1.1,
            ease: "expo.out",
          },
          0.1,
        )
        .to(
          "[data-badge]",
          { scale: 1, rotation: 0, duration: 0.9, ease: "back.out(1.9)" },
          0.45,
        )
        .to(
          path,
          { strokeDashoffset: 0, duration: 0.55, ease: "power2.out" },
          1.0,
        )
        .call(burst, [], 1.05)
        .fromTo(
          "[data-badge]",
          { y: 0 },
          { y: -6, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" },
          1.05,
        )
        .to(
          "[data-rise]",
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.8,
            stagger: 0.1,
            ease: "expo.out",
          },
          0.8,
        )
        .add(() => {
          gsap.fromTo(
            "[data-ring]",
            { scale: 0.8, opacity: 0.7 },
            {
              scale: 1.9,
              opacity: 0,
              duration: 2.4,
              repeat: -1,
              stagger: 1.2,
              ease: "power1.out",
            },
          );
        }, 1.6);
    }, root);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pr);
      window.removeEventListener("resize", resize);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      ctx.revert();
      gsap.killTweensOf([
        crystals.scale,
        ...rings.map((r) => r.scale),
        ...rings.map((r) => r.material),
      ]);
      bg.dispose();
      fx.dispose();
    };
  }, []);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#fdeadb] px-4 py-12 font-[family-name:var(--font-body)]"
    >
      {/* ================= BACKGROUND ================= */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] via-[#fde3cc] to-[#fbc9a0]" />
        <div
          data-blob="a"
          className="absolute -left-32 top-0 h-[460px] w-[460px] rounded-full bg-orange-400/35 blur-[120px]"
        />
        <div
          data-blob="b"
          className="absolute -right-32 bottom-0 h-[480px] w-[480px] rounded-full bg-amber-400/35 blur-[120px]"
        />
        <div
          data-blob="c"
          className="absolute left-1/2 top-1/3 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-emerald-300/30 opacity-50 blur-[110px]"
        />

        {/* 3D grid floor */}
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] overflow-hidden"
          style={{
            perspective: "500px",
            maskImage: "linear-gradient(to top, #000 10%, transparent 95%)",
            WebkitMaskImage:
              "linear-gradient(to top, #000 10%, transparent 95%)",
          }}
        >
          <div
            data-floor
            className="absolute -inset-x-[50%] bottom-0 h-[200%] origin-bottom"
            style={{
              transform: "rotateX(68deg)",
              backgroundImage:
                "linear-gradient(rgba(234,88,12,0.35) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(234,88,12,0.35) 1.5px, transparent 1.5px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        {/* dot grid + cursor reveal */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(194,65,12,0.18) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />

        {/* Three.js: floating crystals */}
        <canvas
          ref={bgCanvas}
          data-crystals
          className="absolute inset-0 h-full w-full"
        />

        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(154,52,18,0.18)_100%)]" />
      </div>

      {/* ================= CARD ================= */}
      <div
        className="relative z-10 w-full max-w-md"
        style={{ perspective: 1400 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 -bottom-10 h-14 rounded-[50%] bg-emerald-900/20 blur-2xl"
        />

        <div data-card>
          <div
            data-tilt
            style={{
              transformStyle: "preserve-3d",
              perspective: 1400,
              ["--gx" as string]: 50,
              ["--gy" as string]: 50,
            }}
            className="relative rounded-[2rem] p-10 text-center"
          >
            {/* glass layer with emerald→orange edge */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-30px_rgba(16,185,129,0.55)]"
            >
              <div
                data-edge
                className="absolute -inset-[60%]"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0 55%, rgba(52,211,153,0.9) 68%, rgba(251,146,60,0.95) 80%, transparent 92%)",
                }}
              />
              <div className="absolute inset-[1.5px] rounded-[calc(2rem-1.5px)] border border-white/60 bg-white/85 backdrop-blur-2xl" />
              <div
                className="absolute inset-[1.5px] rounded-[calc(2rem-1.5px)] mix-blend-soft-light"
                style={{
                  background:
                    "radial-gradient(360px circle at calc(var(--gx) * 1%) calc(var(--gy) * 1%), rgba(255,255,255,0.7), transparent 65%)",
                }}
              />
            </div>

            {/* success badge (unchanged icon) */}
            <div
              data-rise
              className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center"
              style={{ transform: "translateZ(50px)" }}
            >
              {[0, 1].map((i) => (
                <span
                  key={i}
                  data-ring
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-400/60 opacity-0"
                />
              ))}
              <div
                data-badge
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)]"
              >
                <svg viewBox="0 0 52 52" className="h-12 w-12" fill="none">
                  <path
                    data-check
                    pathLength={1}
                    d="M14 27 L23 36 L39 17"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <span
              data-rise
              className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm"
              style={{ transform: "translateZ(30px)" }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Order confirmed
            </span>

            <h1
              data-rise
              className="relative mb-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-gray-900 sm:text-4xl"
              style={{ transform: "translateZ(40px)" }}
            >
              Payment successful
            </h1>

            <p
              data-rise
              className="relative mx-auto mb-6 max-w-xs text-sm font-medium text-gray-600"
            >
              We verified your payment. Your template or plan is unlocked and
              ready to use.
            </p>

            {orderId && (
              <div
                data-rise
                className="relative mb-8 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-orange-200 bg-white/70 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500">
                    Order ID
                  </p>
                  <p className="truncate font-mono text-sm font-bold text-gray-900">
                    {shortId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyId}
                  aria-label="Copy order ID"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}

            <div data-rise className="relative z-20">
              <Link
                href="/dashboard"
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-gray-800 to-gray-950 py-4 font-bold text-white shadow-[0_18px_40px_-14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
              >
                <span
                  data-shimmer
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
                <span className="relative">Go to dashboard</span>
                <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1.5" />
              </Link>
            </div>

            <p
              data-rise
              className="relative mt-5 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified
              by JazzCash
            </p>
          </div>
        </div>
      </div>

      {/* Three.js: confetti + shock rings, in front of the card */}
      <canvas
        ref={fxCanvas}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />
    </div>
  );
}
