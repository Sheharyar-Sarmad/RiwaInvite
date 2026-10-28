"use client";

import { useState, useCallback } from "react";
import {
  Mail,
  Phone,
  Calendar,
  Receipt,
  Send,
  Trash2,
  Copy,
  Check,
  X,
  TriangleAlert,
  BadgeCheck,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserListRow, UserAvatar } from "../sections/users/UsersClient";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 opacity-0 transition-all hover:bg-gray-900/5 hover:text-gray-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 group-hover:opacity-100"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "check" : "copy"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function ContactRow({
  icon: Icon,
  value,
  label,
  muted,
}: {
  icon: typeof Mail;
  value: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-900/[0.03]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-gray-900/5">
        <Icon className="h-3.5 w-3.5 text-gray-500" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className={`truncate text-sm font-medium ${muted ? "text-gray-400" : "text-gray-800"}`}>{value}</p>
      </div>
      {!muted && <CopyButton value={value} label={label.toLowerCase()} />}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  tint,
}: {
  icon: typeof Send;
  value: string | number;
  label: string;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tint}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="leading-tight">
        <p className="text-xl font-semibold tabular-nums tracking-tight text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function UserProfileModal({
  user,
  isOpen,
  onClose,
  onDelete,
}: {
  user: UserListRow;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isActive = user.subscription_status === "active";
  const fullName = `${user.first_name} ${user.last_name}`;
  const joined = new Date(user.created_at);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmingDelete(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* 
        FIX APPLIED: Removed `top-[8%]` and `translate-y-0` from the className below.
        The modal will now perfectly center vertically and horizontally on all screens.
      */}
      <DialogContent
        className="gap-0 overflow-hidden rounded-3xl border-0 bg-white/80 p-0 shadow-[0_0_0_1px_rgba(16,24,40,0.06),0_24px_48px_-12px_rgba(16,24,40,0.25),0_48px_96px_-24px_rgba(234,88,12,0.18)] backdrop-blur-2xl sm:max-w-[500px] [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:flex [&>button]:h-8 [&>button]:w-8 [&>button]:cursor-pointer [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-white/60 [&>button]:opacity-100 [&>button]:ring-1 [&>button]:ring-gray-900/5 [&>button]:backdrop-blur [&>button]:transition-colors hover:[&>button]:bg-white"
      >
        <MotionConfig reducedMotion="user">
          <DialogTitle className="sr-only">{fullName}</DialogTitle>
          <DialogDescription className="sr-only">
            Profile details and account activity for {fullName}
          </DialogDescription>

          {/* Banner */}
          <div className="relative h-20 overflow-hidden bg-gradient-to-br from-orange-400 via-orange-300 to-amber-200">
            <div
              aria-hidden
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 120%, rgba(255,255,255,0.9) 0, transparent 45%), radial-gradient(circle at 90% -20%, rgba(255,255,255,0.7) 0, transparent 40%)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
              style={{
                backgroundImage: "radial-gradient(rgba(0,0,0,0.9) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            />
          </div>

          {/* Avatar overlapping banner */}
          <div className="relative px-6">
            <div className="absolute -top-8 left-6 rounded-full bg-white p-1 shadow-[0_8px_20px_-6px_rgba(16,24,40,0.3)]">
              <UserAvatar firstName={user.first_name} lastName={user.last_name} size="lg" />
            </div>
          </div>

          <div className="space-y-4 px-6 pb-5 pt-11">
            {/* Identity */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold leading-tight tracking-tight text-gray-900">
                  {fullName}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                  <span className="relative flex h-2 w-2">
                    {isActive && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-300"}`}
                    />
                  </span>
                  {isActive ? "Active subscriber" : "No active subscription"}
                </p>
              </div>

              {isActive && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-emerald-50 to-emerald-100/70 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {user.plan_name || "Active"}
                </span>
              )}
            </div>

            {/* Contact */}
            <div className="-mx-1">
              <ContactRow icon={Mail} label="Email" value={user.email} />
              <ContactRow
                icon={Phone}
                label="Phone"
                value={user.phone_number || "No phone number added"}
                muted={!user.phone_number}
              />
              <ContactRow
                icon={Calendar}
                label="Member since"
                value={`${format(joined, "MMM d, yyyy")} (${formatDistanceToNowStrict(joined)} ago)`}
                muted
              />
            </div>

            {/* Activity */}
            <div className="grid grid-cols-2 divide-x divide-gray-900/[0.06] overflow-hidden rounded-2xl bg-white/70 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-gray-900/[0.06]">
              <Stat
                icon={Send}
                value={user.invitation_count}
                label={user.invitation_count === 1 ? "Invitation sent" : "Invitations sent"}
                tint="bg-orange-50 text-orange-600"
              />
              <Stat
                icon={Receipt}
                value={user.order_count}
                label={user.order_count === 1 ? "Order placed" : "Orders placed"}
                tint="bg-blue-50 text-blue-600"
              />
            </div>

            {/* Actions */}
            <AnimatePresence mode="wait" initial={false}>
              {confirmingDelete ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-2xl bg-red-50/80 p-3.5 ring-1 ring-inset ring-red-200/70"
                >
                  <div className="flex gap-3">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <div className="text-sm">
                      <p className="font-semibold text-red-900">Delete {user.first_name}&apos;s account?</p>
                      <p className="mt-0.5 text-red-800/80">
                        This removes the account along with {user.invitation_count}{" "}
                        {user.invitation_count === 1 ? "invitation" : "invitations"} and {user.order_count}{" "}
                        {user.order_count === 1 ? "order" : "orders"}. This can&apos;t be undone.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer rounded-lg text-red-900 hover:bg-red-100"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Keep account
                    </Button>
                    <Button
                      size="sm"
                      className="cursor-pointer rounded-lg bg-red-600 text-white shadow-sm hover:bg-red-700"
                      onClick={onDelete}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Continue to delete
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex gap-3"
                >
                  <Button
                    variant="outline"
                    className="h-10 flex-1 cursor-pointer rounded-xl border-gray-200 bg-white/70 font-medium shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-[0.98]"
                    onClick={onClose}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10 flex-1 cursor-pointer rounded-xl border border-red-100 bg-red-50/60 font-medium text-red-600 transition-all hover:bg-red-100 hover:text-red-700 active:scale-[0.98]"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete user
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </MotionConfig>
      </DialogContent>
    </Dialog>
  );
}