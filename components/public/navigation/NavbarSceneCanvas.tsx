"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OctahedronGeometry, SphereGeometry, type Mesh } from "three";

/**
 * Slow-falling, rotating geometric "diamonds" (Octahedrons)
 * and soft glowing particles. Visuals are unchanged from the original NavbarScene.
 * (Unused @react-three/drei imports - Float, Environment - were removed.)
 */

type Frameloop = "always" | "demand" | "never";

// Individual falling element
function FallingElement({
  position,
  speed,
  rotationSpeed,
  color,
  isWireframe,
  geometry,
}: {
  position: [number, number, number];
  speed: number;
  rotationSpeed: [number, number];
  color: string;
  isWireframe: boolean;
  geometry: OctahedronGeometry;
}) {
  const ref = useRef<Mesh>(null);

  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    const delta = Math.min(rawDelta, 0.05); // no big jump after a pause
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
    <mesh ref={ref} position={position} geometry={geometry}>
      <meshBasicMaterial
        color={color}
        wireframe={isWireframe}
        transparent
        opacity={isWireframe ? 0.3 : 0.15}
      />
    </mesh>
  );
}

// A soft glowing point light/particle (unit sphere scaled to `size`, same look as before)
function GlowParticle({
  position,
  size,
  color,
  geometry,
}: {
  position: [number, number, number];
  size: number;
  color: string;
  geometry: SphereGeometry;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    const delta = Math.min(rawDelta, 0.05);
    ref.current.position.y -= 0.2 * delta;
    if (ref.current.position.y < -5) ref.current.position.y = 5;
  });

  return (
    <mesh ref={ref} position={position} scale={size} geometry={geometry}>
      <meshBasicMaterial color={color} transparent opacity={0.1} />
    </mesh>
  );
}

function Scene({ frameloop }: { frameloop: Frameloop }) {
  // In "demand" mode (reduced motion) make sure a frame is drawn when we become active.
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [frameloop, invalidate]);

  // Shared geometries: 1 octahedron + 1 sphere instead of 25 separate geometries.
  const diamondGeo = useMemo(() => new OctahedronGeometry(0.15, 0), []);
  const glowGeo = useMemo(() => new SphereGeometry(1, 16, 16), []);
  useEffect(
    () => () => {
      diamondGeo.dispose();
      glowGeo.dispose();
    },
    [diamondGeo, glowGeo],
  );

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
          (Math.random() - 0.5) * 5, // slight Z depth
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
          -2, // push back
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
          return <FallingElement key={i} {...el} geometry={diamondGeo} />;
        }
        return (
          <GlowParticle key={i} position={el.position} size={el.size} color={el.color} geometry={glowGeo} />
        );
      })}
    </>
  );
}

export function NavbarSceneCanvas({
  frameloop,
  onReady,
}: {
  frameloop: Frameloop;
  onReady?: () => void;
}) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 100 }} // Zoom makes the objects small and subtle
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      frameloop={frameloop}
      onCreated={() => onReady?.()}
    >
      <Scene frameloop={frameloop} />
    </Canvas>
  );
}