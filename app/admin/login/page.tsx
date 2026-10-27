import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/forms/LoginForm";

// Save as: src/app/admin/login/page.tsx
export const metadata: Metadata = {
  title: "Admin login",
  description: "Sign in to manage orders, templates and users.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <LoginForm />;
}