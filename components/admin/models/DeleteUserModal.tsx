"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, PowerOff, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserListRow } from "../sections/users/UsersClient";

type Props = {
  user: UserListRow;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Blockers = {
  active_subscriptions: number;
  past_due_subscriptions: number;
  pending_orders: number;
};

export function DeleteUserModal({ user, isOpen, onClose, onSuccess }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [reason, setReason] = useState("");
  const [blockers, setBlockers] = useState<Blockers | null>(null);

  const handleDelete = async (mode: "soft_delete" | "deactivate" = "soft_delete") => {
    setIsDeleting(true);
    setBlockers(null);

    try {
      const response = await apiClient.delete(`/admin/dashboard/users/${user.id}`, {
        data: { mode, reason },
      });

      toast.add({
        title: mode === "deactivate" ? "User Deactivated" : "User Deleted",
        description: response.data.message,
        type: "success",
      });
      onSuccess();
    } catch (error: any) {
      const status = error.response?.status;
      const json = error.response?.data;

      if (status === 409 && json?.error === "DELETION_BLOCKED") {
        setBlockers(json.blockers);
        setIsDeleting(false);
        return;
      }

      if (status === 409 && json?.error === "ALREADY_DELETED") {
        toast.add({ title: "Already Deleted", description: "This account is already anonymized.", type: "error" });
        onClose();
        return;
      }

      toast.add({
        title: "Error",
        description: json?.message || error.message || "Failed to delete user",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetAndClose = () => {
    setBlockers(null);
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      {/* Removed any top/translate overrides to ensure perfect centering */}
      <DialogContent className="gap-4 rounded-2xl border-orange-100/50 bg-white/90 backdrop-blur-2xl sm:max-w-md [&>button]:cursor-pointer">
        {blockers ? (
          <>
            <DialogHeader>
              <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <DialogTitle className="text-xl">Deletion blocked</DialogTitle>
              <DialogDescription className="text-gray-600">
                This user has active revenue or services attached to their account. You can&apos;t permanently
                delete them until these are resolved.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg bg-orange-50 p-4 text-sm text-orange-800">
              <ul className="list-disc space-y-1 pl-5">
                {blockers.active_subscriptions > 0 && <li>{blockers.active_subscriptions} active subscription(s)</li>}
                {blockers.past_due_subscriptions > 0 && (
                  <li>{blockers.past_due_subscriptions} past due subscription(s)</li>
                )}
                {blockers.pending_orders > 0 && <li>{blockers.pending_orders} pending order(s)</li>}
              </ul>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={() => handleDelete("deactivate")}
                disabled={isDeleting}
                className="w-full cursor-pointer bg-orange-500 text-white hover:bg-orange-600"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PowerOff className="mr-2 h-4 w-4" />
                )}
                Deactivate account instead
              </Button>
              <Button variant="ghost" onClick={resetAndClose} className="w-full cursor-pointer">
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-xl">Delete {user.first_name}?</DialogTitle>
              <DialogDescription className="text-gray-600">
                This anonymizes the user&apos;s data and revokes all access. It can&apos;t be undone, but their
                financial history stays intact.
              </DialogDescription>
            </DialogHeader>

            <div>
              <label htmlFor="delete-reason" className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason for deletion (optional)
              </label>
              <Input
                id="delete-reason"
                placeholder="e.g. Spam account, user requested..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                /* FIX APPLIED: Added focus styles to remove the black ring */
                className="border-orange-100/50 bg-white/80 backdrop-blur-xl transition-all focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-0 focus-visible:border-orange-300 focus-visible:outline-none"
              />
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={resetAndClose} className="flex-1 cursor-pointer">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete("soft_delete")}
                disabled={isDeleting}
                className="flex-1 cursor-pointer bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete user
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}