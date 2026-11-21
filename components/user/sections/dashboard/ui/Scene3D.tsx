"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

/*
 * Themed Three.js scenes for the dashboard (matches the landing page look:
 * glass arch invitations, rose petals, gold orbs, warm peach light).
 *
 *   cards  - three floating glass invitations + rings, petals, gold orbs (header)
 *   gem    - faceted gem, wireframe core, tilting ring, sparkles      (plan card)
 *   orbs   - stack of gold coins that drop in and spin                 (spend card)
 *   petals - full-viewport ambient petals and gold orbs                (page bg)
 *
 * npm i three && npm i -D @types/three
 */

type Three = typeof import("three");
type Obj = import("three").Object3D;
export type SceneVariant = "cards" | "gem" | "orbs" | "petals";

type Pointer = { x: number; y: number };
type Builder = {
  /** t = seconds, intro = 0..1.x springy entrance, p = smoothed pointer (-1..1) */
  update: (t: number, intro: number, p: Pointer) => void;
};

const PINKS = [0xf9a8b8, 0xfbc4ab, 0xfda4af, 0xffd1c1];
const GOLD = 0xf5b84a;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/* ----------------------------- shared helpers ----------------------------- */

function goldMat(T: Three) {
  return new T.MeshStandardMaterial({
    color: GOLD,
    metalness: 0.55,
    roughness: 0.3,
    emissive: 0x7a4a00,
    emissiveIntensity: 0.3,
  });
}

function makePetals(
  T: Three,
  parent: Obj,
  count: number,
  sx: number,
  sy: number,
  sz: number,
  speed: number,
  size: number,
) {
  const mesh = new T.InstancedMesh(
    new T.SphereGeometry(0.1, 12, 8),
    new T.MeshStandardMaterial({ roughness: 0.6, side: T.DoubleSide }),
    count,
  );
  const cols = PINKS.map((c) => new T.Color(c));
  const seeds = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 2 * sx,
    y: Math.random(),
    z: (Math.random() - 0.5) * 2 * sz,
    v: (0.1 + Math.random() * 0.15) * speed,
    ph: Math.random() * 6.28,
    sw: 0.3 + Math.random() * 0.6,
    s: (0.7 + Math.random() * 0.9) * size,
  }));
  seeds.forEach((_, i) => mesh.setColorAt(i, cols[i % cols.length]));
  parent.add(mesh);
  const d = new T.Object3D();
  return (t: number, fade = 1) => {
    seeds.forEach((s, i) => {
      const f = (((s.y - t * s.v) % 1) + 1) % 1;
      d.position.set(s.x + Math.sin(t * s.sw + s.ph) * 0.5, (0.5 - f) * 2 * sy, s.z);
      d.rotation.set(t * s.sw + s.ph, t * s.sw * 0.7, s.ph);
      const edge = Math.min(1, f * 6, (1 - f) * 6) * fade; // fade in/out at top and bottom
      d.scale.set(s.s * 1.3 * edge, s.s * 0.8 * edge, s.s * 0.2 * edge);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}

function makeOrbs(T: Three, parent: Obj, spec: [number, number, number, number][]) {
  const mat = goldMat(T);
  const geo = new T.SphereGeometry(1, 24, 24);
  const orbs = spec.map(([x, y, z, r], i) => {
    const m = new T.Mesh(geo, mat);
    m.scale.setScalar(r);
    m.position.set(x, y, z);
    parent.add(m);
    return { m, x, y, z, r, ph: i * 1.7 };
  });
  return (t: number, intro: number) => {
    orbs.forEach((o) => {
      o.m.position.set(o.x + Math.sin(t * 0.6 + o.ph) * 0.12, o.y + Math.sin(t * 1.1 + o.ph) * 0.18, o.z);
      o.m.scale.setScalar(o.r * Math.max(intro, 0) * (1 + Math.sin(t * 2 + o.ph) * 0.05));
    });
  };
}

/* --------------------------------- scenes --------------------------------- */

function buildCards(T: Three, scene: Obj): Builder {
  const group = new T.Group();
  scene.add(group);

  const w = 1.5;
  const h = 2.1;
  const shape = new T.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2 - w / 2);
  shape.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false);
  shape.lineTo(-w / 2, -h / 2);

  const geo = new T.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geo.center();
  const outline = new T.BufferGeometry().setFromPoints(
    shape.getPoints(48).map((p) => new T.Vector3(p.x * 0.86, p.y * 0.88, 0)),
  );
  const lineMat = new T.LineBasicMaterial({ color: GOLD });

  const card = (color: number, opacity: number) => {
    const g = new T.Group();
    g.add(
      new T.Mesh(
        geo,
        new T.MeshPhysicalMaterial({
          color,
          transparent: true,
          opacity,
          roughness: 0.25,
          clearcoat: 1,
          clearcoatRoughness: 0.2,
        }),
      ),
    );
    const line = new T.LineLoop(outline, lineMat);
    line.position.z = 0.1;
    g.add(line);
    return g;
  };

  const left = card(0xffd9cc, 0.8);
  const center = card(0x1f5a44, 0.96);
  const right = card(0xffcfd8, 0.8);

  // two interlocked rings on the centre card
  const ringGeo = new T.TorusGeometry(0.14, 0.022, 12, 40);
  const rings = new T.Group();
  const r1 = new T.Mesh(ringGeo, goldMat(T));
  const r2 = new T.Mesh(ringGeo, goldMat(T));
  r1.position.x = -0.09;
  r2.position.x = 0.09;
  rings.add(r1, r2);
  rings.position.set(0, 0.35, 0.12);
  center.add(rings);

  const slots = [
    { g: left, x: -1.4, y: -0.1, z: -0.5, ry: 0.5, rz: 0.12, ph: 0, s: 1 },
    { g: right, x: 1.4, y: -0.1, z: -0.5, ry: -0.5, rz: -0.12, ph: 2.1, s: 1 },
    { g: center, x: 0, y: 0.05, z: 0.3, ry: 0, rz: 0, ph: 4.2, s: 1.1 },
  ];
  slots.forEach((s) => group.add(s.g));

  const petals = makePetals(T, scene, 26, 3, 2.3, 1.4, 1.1, 1);
  const orbs = makeOrbs(T, group, [
    [-2.1, 1.1, 0.6, 0.16],
    [2.2, 0.9, 0.5, 0.12],
    [-1.7, -1.3, 0.8, 0.1],
    [1.9, -1.2, 0.7, 0.18],
  ]);

  return {
    update(t, intro, p) {
      slots.forEach((s) => {
        const k = Math.max(intro, 0);
        s.g.position.set(s.x * k, s.y + Math.sin(t * 1.1 + s.ph) * 0.09, s.z);
        s.g.rotation.set(
          p.y * 0.12,
          s.ry * k + Math.sin(t * 0.5 + s.ph) * 0.08 + p.x * 0.28,
          s.rz + Math.sin(t * 0.7 + s.ph) * 0.03,
        );
        s.g.scale.setScalar(s.s * k);
      });
      rings.rotation.y = Math.sin(t * 0.9) * 0.5;
      r1.rotation.x = t * 0.8;
      r2.rotation.x = -t * 0.8;
      petals(t, clamp01(intro));
      orbs(t, intro);
    },
  };
}

function buildGem(T: Three, scene: Obj): Builder {
  const group = new T.Group();
  scene.add(group);

  const gem = new T.Mesh(
    new T.IcosahedronGeometry(1.15, 0),
    new T.MeshPhysicalMaterial({
      color: 0xffb35a,
      roughness: 0.18,
      metalness: 0.35,
      flatShading: true,
      clearcoat: 1,
    }),
  );
  const core = new T.Mesh(
    new T.IcosahedronGeometry(0.62, 0),
    new T.MeshBasicMaterial({ color: 0xfff1d6, wireframe: true, transparent: true, opacity: 0.8 }),
  );
  group.add(gem, core);

  const ring = new T.Mesh(
    new T.TorusGeometry(1.9, 0.035, 12, 96),
    new T.MeshStandardMaterial({ color: 0xfff1e0, roughness: 0.3, metalness: 0.3 }),
  );
  ring.rotation.x = Math.PI / 2.6;
  group.add(ring);

  const orbit = new T.Group();
  for (let i = 0; i < 3; i++) {
    const m = new T.Mesh(
      new T.SphereGeometry(0.1, 16, 16),
      new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfbbf24, emissiveIntensity: 0.7 }),
    );
    const a = (i / 3) * Math.PI * 2;
    m.position.set(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9);
    orbit.add(m);
  }
  orbit.rotation.x = Math.PI / 2.6;
  group.add(orbit);

  const N = 48;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 1.7 + Math.random() * 1.1;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const sparkGeo = new T.BufferGeometry();
  sparkGeo.setAttribute("position", new T.BufferAttribute(pos, 3));
  const sparkMat = new T.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false });
  const sparks = new T.Points(sparkGeo, sparkMat);
  group.add(sparks);

  const pulse = new T.PointLight(0xffa24d, 30, 12);
  pulse.position.set(0, 0, 2.5);
  scene.add(pulse);
  const orbs = makeOrbs(T, group, [
    [-2.2, 1.3, 0.4, 0.12],
    [2.3, -1.2, 0.4, 0.15],
  ]);

  return {
    update(t, intro, p) {
      const k = Math.max(intro, 0);
      group.scale.setScalar(k);
      group.position.y = Math.sin(t * 1.2) * 0.14;
      group.rotation.set(p.y * 0.3, p.x * 0.5, 0);
      gem.rotation.set(t * 0.25, t * 0.6, 0);
      core.rotation.set(-t * 0.5, -t * 0.8, t * 0.3);
      ring.rotation.z = t * 0.3;
      orbit.rotation.y = -t * 0.6;
      orbit.rotation.z = Math.sin(t * 0.4) * 0.2;
      sparks.rotation.y = t * 0.2;
      sparkMat.opacity = 0.55 + 0.4 * Math.sin(t * 3);
      pulse.intensity = 30 + 16 * Math.sin(t * 2);
      orbs(t, intro);
    },
  };
}

function buildOrbs(T: Three, scene: Obj): Builder {
  const group = new T.Group();
  scene.add(group);

  const coinGeo = new T.CylinderGeometry(0.9, 0.9, 0.16, 48);
  const coinMat = goldMat(T);
  const coins = Array.from({ length: 4 }, (_, i) => {
    const c = new T.Mesh(coinGeo, coinMat);
    const rest = -0.55 + i * 0.22;
    group.add(c);
    return { c, rest, delay: i * 0.18 };
  });
  group.rotation.x = 0.5;

  const sat = new T.Group();
  scene.add(sat);
  const sats = Array.from({ length: 3 }, (_, i) => {
    const m = new T.Mesh(new T.SphereGeometry(0.11, 16, 16), goldMat(T));
    sat.add(m);
    return { m, a: (i / 3) * Math.PI * 2 };
  });

  return {
    update(t, _intro, p) {
      coins.forEach((o, i) => {
        const k = easeOutCubic(clamp01((t - o.delay) / 0.9));
        const bounce = Math.abs(Math.sin((1 - k) * Math.PI * 1.5)) * (1 - k) * 0.5;
        o.c.position.y = o.rest + (1 - k) * 3 + bounce;
        o.c.rotation.y = t * 0.5 + i * 0.45;
        o.c.scale.setScalar(clamp01(k * 3));
      });
      group.position.y = Math.sin(t * 1.1) * 0.1;
      group.rotation.set(0.5 + p.y * 0.2, p.x * 0.4, 0);
      sats.forEach((s) => {
        const a = s.a + t * 0.7;
        s.m.position.set(Math.cos(a) * 1.6, Math.sin(a * 1.3) * 0.4 + 0.2, Math.sin(a) * 1.6);
      });
    },
  };
}

function buildPetals(T: Three, scene: Obj, aspect: number): Builder {
  const group = new T.Group();
  scene.add(group);
  const half = 3.73; // half of visible height at fov 50, z 8
  const count = Math.round(Math.min(60, Math.max(24, aspect * 28)));
  const petals = makePetals(T, group, count, half * aspect, half + 0.5, 2.5, 0.7, 1.35);
  const orbs = makeOrbs(
    T,
    group,
    Array.from({ length: 7 }, (_, i) => [
      (Math.random() - 0.5) * 2 * half * aspect,
      (Math.random() - 0.5) * 2 * half,
      -1 + Math.random() * 2,
      0.12 + (i % 3) * 0.07,
    ]),
  );
  return {
    update(t, intro, p) {
      group.position.set(-p.x * 0.35, p.y * 0.25, 0);
      petals(t, clamp01(intro));
      orbs(t, intro);
    },
  };
}

/* ------------------------------- component -------------------------------- */

export function Scene3D({ variant, className }: { variant: SceneVariant; className?: string }) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: () => void = () => {};

    (async () => {
      const T = await import("three");
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      } catch {
        return; // no WebGL: the dashboard still looks fine without scenes
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, variant === "petals" ? 1.5 : 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
      host.appendChild(renderer.domElement);

      const ambient = variant === "petals";
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(ambient ? 50 : 35, 1, 0.1, 60);
      camera.position.set(0, 0, ambient ? 8 : 7);

      scene.add(new T.AmbientLight(0xfff0e6, 0.95));
      const key = new T.DirectionalLight(0xffffff, 2.3);
      key.position.set(3, 4, 5);
      scene.add(key);
      const warm = new T.PointLight(0xff8a3d, 45, 20);
      warm.position.set(-3, -1, 3);
      scene.add(warm);
      const rose = new T.PointLight(0xff7a9a, 25, 20);
      rose.position.set(3, -2, 3);
      scene.add(rose);

      const w0 = host.clientWidth || 1;
      const h0 = host.clientHeight || 1;
      const builder =
        variant === "cards"
          ? buildCards(T, scene)
          : variant === "gem"
            ? buildGem(T, scene)
            : variant === "orbs"
              ? buildOrbs(T, scene)
              : buildPetals(T, scene, w0 / h0);

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

      const clock = new T.Clock();
      let raf = 0;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) return;
        const t = clock.getElapsedTime();
        pointer.x += (target.x - pointer.x) * 0.05;
        pointer.y += (target.y - pointer.y) * 0.05;
        builder.update(t, easeOutBack(clamp01(t / 1.3)), pointer);
        renderer.render(scene, camera);
      };

      if (reduce) {
        builder.update(4, 1, pointer);
        renderer.render(scene, camera);
      } else {
        window.addEventListener("pointermove", onMove, { passive: true });
        frame();
      }
      host.style.opacity = ambient ? "0.6" : "1";

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        io.disconnect();
        scene.traverse((o) => {
          const m = o as import("three").Mesh;
          m.geometry?.dispose();
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
  }, [variant, reduce]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{ opacity: 0 }}
      className={["transition-opacity duration-1000", className].filter(Boolean).join(" ")}
    />
  );
}