import Link from "next/link";
import { Surface3D } from "@/components/three/Surface3D";


export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Your admin workspace is ready. Press Ctrl K to jump anywhere.</p>
      </div>
    </div>
  );
}