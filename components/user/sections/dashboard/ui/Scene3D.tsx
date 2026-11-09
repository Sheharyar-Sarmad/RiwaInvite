"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "../constants";

export function Scene3D({ className }: { className?: string }) {
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
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); } catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
      camera.position.set(0, 0, 7);
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 5); scene.add(key);
      const glow = new THREE.PointLight(0xff8a3d, 45, 20); glow.position.set(-3, -1, 3); scene.add(glow);
      const group = new THREE.Group(); scene.add(group);

      const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), new THREE.MeshStandardMaterial({ color: 0xffb35a, roughness: 0.22, metalness: 0.45, flatShading: true }));
      group.add(gem);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.035, 12, 96), new THREE.MeshStandardMaterial({ color: 0xfff1e0, roughness: 0.3, metalness: 0.3 }));
      ring.rotation.x = Math.PI / 2.6; group.add(ring);
      const orbit = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfbbf24, emissiveIntensity: 0.6 }));
        const a = (i / 3) * Math.PI * 2; m.position.set(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9); orbit.add(m);
      }
      orbit.rotation.x = Math.PI / 2.6; group.add(orbit);
      const update = (t: number) => { gem.rotation.y = t * 0.6; gem.rotation.x = t * 0.25; orbit.rotation.y = -t * 0.5; };

      const pointer = { x: 0, y: 0 }; const target = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; };

      const resize = () => {
        const w = host.clientWidth || 1; const h = host.clientHeight || 1;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        if (reduce) renderer.render(scene, camera);
      };
      const ro = new ResizeObserver(resize); ro.observe(host); resize();

      let visible = true; const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 }); io.observe(host);
      const clock = new THREE.Clock(); let raf = 0;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) return;
        const t = clock.getElapsedTime();
        pointer.x += (target.x - pointer.x) * 0.05; pointer.y += (target.y - pointer.y) * 0.05;
        group.rotation.y = pointer.x * 0.5; group.rotation.x = pointer.y * 0.3; group.position.y = Math.sin(t * 1.2) * 0.12;
        update(t); renderer.render(scene, camera);
      };

      if (reduce) { update(0); renderer.render(scene, camera); } else { window.addEventListener("pointermove", onMove, { passive: true }); frame(); }
      host.style.opacity = "1";

      cleanup = () => {
        cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove);
        ro.disconnect(); io.disconnect();
        scene.traverse((o) => {
          const m = o as import("three").Mesh; if (m.geometry) m.geometry.dispose();
          const mat = m.material as import("three").Material | import("three").Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
        });
        renderer.dispose(); renderer.domElement.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, [reduce]);

  return <div ref={hostRef} aria-hidden style={{ opacity: 0 }} className={cn("transition-opacity duration-700", className)} />;
}