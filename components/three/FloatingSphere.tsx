"use client";

import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";

export function FloatingSphere() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 2]} intensity={1} color="#ff5e00" />
        <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
          <Sphere args={[1.5, 64, 64]}>
            <MeshDistortMaterial
              color="#1a1a1a"
              attach="material"
              distort={0.4}
              speed={1.5}
              roughness={0.2}
              metalness={0.8}
            />
          </Sphere>
        </Float>
      </Canvas>
    </div>
  );
}