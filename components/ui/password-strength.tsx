"use client";

import { Check, X } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password?: string;
}

export function PasswordStrength({ password = "" }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    if (checks.length) score++;
    if (checks.uppercase) score++;
    if (checks.lowercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    return { score, checks };
  }, [password]);

  const getStrengthText = () => {
    if (!password) return "Enter a password";
    if (strength.score <= 2) return "Weak";
    if (strength.score === 3) return "Medium";
    if (strength.score === 4) return "Strong";
    return "Very Strong";
  };

  const getStrengthColor = () => {
    if (!password) return "bg-zinc-700";
    if (strength.score <= 2) return "bg-red-500";
    if (strength.score === 3) return "bg-yellow-500";
    if (strength.score === 4) return "bg-green-500";
    return "bg-emerald-400";
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          Password Strength: <strong className="text-zinc-200">{getStrengthText()}</strong>
        </span>
      </div>
      
      {/* Strength Bars */}
      <div className="flex h-1.5 w-full gap-1 overflow-hidden">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              "h-full flex-1 rounded-full transition-all duration-300",
              strength.score >= level ? getStrengthColor() : "bg-zinc-800"
            )}
          />
        ))}
      </div>

      {/* Checklist */}
      <ul className="grid grid-cols-2 gap-1 mt-3">
        {[
          { key: "length", label: "8+ characters" },
          { key: "uppercase", label: "Uppercase" },
          { key: "lowercase", label: "Lowercase" },
          { key: "number", label: "Number" },
          { key: "special", label: "Special char" },
        ].map(({ key, label }) => {
          const isMet = strength.checks[key as keyof typeof strength.checks];
          return (
            <li key={key} className="flex items-center gap-1.5 text-xs text-zinc-400">
              {isMet ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <X className="h-3 w-3 text-zinc-600" />
              )}
              <span className={isMet ? "text-zinc-300" : ""}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}