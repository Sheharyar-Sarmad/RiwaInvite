import { RegisterForm } from "@/components/admin/forms/RegisterForm";
import settings from "@/config/settings_config";

export const instant = false; // Next.js 16 blocking fix

export const metadata = {
  title: "Admin Registration | Riwainvite",
};

async function getRegistrationStatus() {
  try {
    const config = settings();
    const baseUrl = config.apiBase || "http://localhost:3000/api/v1";
    
    const response = await fetch(`${baseUrl}/admin/auth/registration-status`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) return false;
    const json = await response.json();
    return json.data?.is_registration_open ?? false;
  } catch (error) {
    console.error("Registration status check failed:", error);
    return false;
  }
}

export default async function AdminRegisterPage() {
  const isRegistrationOpen = await getRegistrationStatus();

  return (
    // Clean wrapper, no dark backgrounds or extra 3D elements
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="relative z-10 w-full max-w-xl px-4 py-12">
        <RegisterForm isRegistrationOpen={isRegistrationOpen} />
      </div>
    </div>
  );
}