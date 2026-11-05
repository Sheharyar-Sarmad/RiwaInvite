import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterClient } from "@/components/public/sections/auth/RegisterClient";
import settings from "@/config/settings_config";
import { Metadata } from "next";

const config = settings();

export const metadata: Metadata = {
  title: "Create an Account | Riwainvite",
  description: "Create your Riwainvite account to start designing unforgettable digital invitations and managing your guest lists.",
};

// 1. Make the function async
export default async function RegisterPage() {
  // 2. Await the cookies() function
  const cookieStore = await cookies();
  
  // 3. Now you can safely call .has()
  const hasSession = cookieStore.has(config.sessionCookieName);

  // Instant redirect if already logged in
  if (hasSession) {
    redirect("/dashboard");
  }

  return <RegisterClient />;
}