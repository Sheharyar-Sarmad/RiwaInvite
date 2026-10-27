"use client";

import dynamic from "next/dynamic";

const FloatingSphere = dynamic(
  () => import("@/components/three/FloatingSphere").then((mod) => mod.FloatingSphere),
  { ssr: false }
);

export function ThreeWrapper() {
  return <FloatingSphere />;
}