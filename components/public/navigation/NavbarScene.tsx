"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import * as THREE from "three";

/**
 * Premium Navbar Backdrop
 * Slow-falling, rotating geometric "diamonds" (Octahedrons) 
 * and soft glowing particles. Elegant, classy, and performance-optimized.
 */

// Individual falling element
function FallingElement({ 
  position, 
  speed, 
  rotationSpeed, 
  color, 
  isWireframe 
}: { 
  position: [number, number, number]; 
  speed: number; 
  rotationSpeed: [number, number]; 
  color: string; 
  isWireframe: boolean; 
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    // Slow, continuous downward movement
    ref.current.position.y -= speed * delta;
    
    // Gentle rotation
    ref.current.rotation.x += rotationSpeed[0] * delta;
    ref.current.rotation.y += rotationSpeed[1] * delta;

    // Reset to top when it falls below the screen
    if (ref.current.position.y < -5) {
      ref.current.position.y = 5;
      // Randomize x position slightly on reset for organic feel
      ref.current.position.x = (Math.random() - 0.5) * 20;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      {/* Octahedron looks like a diamond - very premium */}
      <octahedronGeometry args={[0.15, 0]} />
      <meshBasicMaterial 
        color={color} 
        wireframe={isWireframe} 
        transparent 
        opacity={isWireframe ? 0.3 : 0.15} 
      />
    </mesh>
  );
}

// A soft glowing point light/particle
function GlowParticle({ position, size, color }: { position: [number, number, number], size: number, color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.y -= 0.2 * delta;
    if (ref.current.position.y < -5) ref.current.position.y = 5;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.1} />
    </mesh>
  );
}

function Scene() {
  // Generate a static array of elements so they don't re-render randomly
  const elements = useMemo(() => {
    const colors = ["#f97316", "#fb923c", "#fdba74"]; // Orange gradient palette
    const items = [];
    
    // Create 15 floating diamonds
    for (let i = 0; i < 15; i++) {
      items.push({
        type: "diamond" as const,
        position: [
          (Math.random() - 0.5) * 20, // spread across X
          (Math.random() - 0.5) * 10, // spread across Y
          (Math.random() - 0.5) * 5   // slight Z depth
        ] as [number, number, number],
        speed: 0.2 + Math.random() * 0.3,
        rotationSpeed: [Math.random() * 0.5, Math.random() * 0.5] as [number, number],
        color: colors[Math.floor(Math.random() * colors.length)],
        isWireframe: Math.random() > 0.5, // Mix of solid and wireframe
      });
    }

    // Create 10 soft glowing background orbs
    for (let i = 0; i < 10; i++) {
        items.push({
            type: "glow" as const,
            position: [
              (Math.random() - 0.5) * 25,
              (Math.random() - 0.5) * 10,
              -2 // push back
            ] as [number, number, number],
            size: 0.1 + Math.random() * 0.2,
            color: "#f97316",
        });
    }

    return items;
  }, []);

  return (
    <>
      <ambientLight intensity={1} />
      {elements.map((el, i) => {
        if (el.type === "diamond") {
          return <FallingElement key={i} {...el} />;
        }
        if (el.type === "glow") {
          return <GlowParticle key={i} position={el.position} size={el.size} color={el.color} />;
        }
        return null;
      })}
    </>
  );
}

export function NavbarScene({ paused = false }: { paused?: boolean }) {
  const [tabHidden, setTabHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Stop rendering if the tab is hidden (performance saver)
  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Fade out the edges so it blends perfectly with the navbar
  const fade = "linear-gradient(to right, transparent, black 10%, black 90%, transparent)";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 10], zoom: 100 }} // Zoom makes the objects small and subtle
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        frameloop={paused || tabHidden ? "never" : reduceMotion ? "demand" : "always"}
      >
        <Scene />
      </Canvas>
    </div>
  );
}