"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, MoreHorizontal, Trash2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { apiClient } from "@/lib/api/api_base";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AceternitySelect } from "@/components/ui/aceternity-select";
import { DeleteUserModal } from "../../models/DeleteUserModal";
import { UserProfileModal } from "../../models/UserProfileModal";
import { UserSearchCommandModal } from "../../models/UserSearchCommandModal";
import { toast } from "@/components/ui/toast";

export type UserListRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  created_at: string;
  is_deleted: boolean;
  plan_name: string | null;
  subscription_status: string | null;
  purchase_count: number;
  invitation_count: number;
  live_invitation_count: number;
  order_count: number;
};

const statusOptions = [
  { label: "All Users", value: "all" },
  { label: "Active Accounts", value: "active" },
  { label: "Subscribed", value: "subscribed" },
  { label: "Unsubscribed", value: "unsubscribed" },
  { label: "Deleted / Anonymized", value: "deleted" },
];

// Shared Avatar Component
export const AVATAR_COLORS = [
  "bg-red-100 text-red-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700", "bg-purple-100 text-purple-700", "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700", "bg-indigo-100 text-indigo-700",
];

export function UserAvatar({ firstName, lastName, size = "md" }: { firstName: string; lastName: string, size?: "sm" | "md" | "lg" }) {
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  let hash = 0;
  const nameStr = `${firstName}${lastName}`;
  for (let i = 0; i < nameStr.length; i++) hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
  const colorClass = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full border border-white/50 shadow-sm font-semibold ${sizeClass} ${colorClass}`}>
      {initials || "?"}
    </div>
  );
}

export function UsersClient() {
  const [users, setUsers] = useState<UserListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<UserListRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserListRow | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "10", status: statusFilter });
      const response = await apiClient.get(`/admin/dashboard/users?${params.toString()}`);
      setUsers(response.data.data.users);
      setTotalUsers(response.data.data.pagination.total);
      setTotalPages(response.data.data.pagination.total_pages);
    } catch (err: any) {
      toast.add({ title: "Failed to load users", description: err.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          
          {/* SEARCH BUTTON (Opens Modal) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="relative w-full md:w-[320px] flex items-center justify-between h-11 px-4 rounded-full border border-orange-100/50 bg-white/70 backdrop-blur-xl text-sm text-gray-500 shadow-sm transition-all hover:bg-white hover:ring-2 hover:ring-orange-500/20"
          >
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-orange-500" />
              <span>Search or jump to...</span>
            </div>
            <kbd className="hidden md:inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
              /
            </kbd>
          </button>
          
          <div className="w-[200px]">
            <AceternitySelect
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              options={statusOptions}
              placeholder="Filter Status"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-sm font-medium text-orange-700 shadow-sm backdrop-blur-xl">
          <ShieldAlert className="h-4 w-4" />
          {totalUsers} Total Users
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl transition-opacity duration-300 ${isLoading ? "opacity-60" : "opacity-100"}`}>
        <Table>
          <TableHeader>
            <TableRow className="border-white/30 hover:bg-transparent">
              <TableHead className="text-gray-700 font-semibold pl-6">User</TableHead>
              <TableHead className="text-gray-700 font-semibold">Contact</TableHead>
              <TableHead className="text-gray-700 font-semibold">Subscription</TableHead>
              <TableHead className="text-gray-700 font-semibold">Activity</TableHead>
              <TableHead className="text-gray-700 font-semibold">Joined</TableHead>
              <TableHead className="text-right text-gray-700 font-semibold pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && users.length === 0 ? (
               <TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-48 text-center text-gray-500">No users found matching your criteria.</TableCell></TableRow>
            ) : (
              users.map((user) => (
                <TableRow 
                  key={user.id} 
                  onClick={() => setProfileUser(user)} // Click row to open profile
                  className="border-white/30 transition-colors hover:bg-white/50 cursor-pointer"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar firstName={user.first_name} lastName={user.last_name} />
                      <div className="flex flex-col">
                        <span className={`font-semibold ${user.is_deleted ? "text-gray-400 line-through" : "text-gray-900"}`}>
                          {user.first_name} {user.last_name}
                        </span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">{user.phone_number || <span className="text-gray-400 italic">No phone</span>}</TableCell>
                  <TableCell>
                    {user.subscription_status === "active" ? (
                      <span className="inline-flex items-center rounded-full bg-green-100/80 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-700">{user.plan_name || "Active"}</span>
                    ) : user.subscription_status === "canceled" ? (
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/50 px-2.5 py-0.5 text-xs font-semibold text-gray-500">Canceled</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100/80 border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-500">Free</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-gray-600 gap-0.5">
                      <span>{user.invitation_count} Invites <span className="text-gray-400">({user.live_invitation_count} Live)</span></span>
                      <span>{user.order_count} Orders</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                    {/* stopPropagation prevents the row click when clicking the menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-orange-100/50 outline-none transition-colors border border-transparent hover:border-orange-100">
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-orange-100/50 bg-white/90 backdrop-blur-xl">
                        <DropdownMenuItem onClick={() => setDeleteUser(user)} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600 px-2">
        <p>Showing page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages || 1}</span></p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading} className="bg-white/60 backdrop-blur-xl border-white/40 text-gray-700 hover:bg-white/90 rounded-full px-4">Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || isLoading} className="bg-white/60 backdrop-blur-xl border-white/40 text-gray-700 hover:bg-white/90 rounded-full px-4">Next</Button>
        </div>
      </div>

      {/* ─── MODALS ─── */}
      
      <UserSearchCommandModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelectUser={(user) => {
          setIsSearchOpen(false);
          setProfileUser(user); // Opens profile modal directly from search
        }} 
      />

      {profileUser && (
        <UserProfileModal
          user={profileUser}
          isOpen={true}
          onClose={() => setProfileUser(null)}
          onDelete={() => {
            setDeleteUser(profileUser);
            setProfileUser(null);
          }}
        />
      )}

      {deleteUser && (
        <DeleteUserModal
          user={deleteUser}
          isOpen={true}
          onClose={() => setDeleteUser(null)}
          onSuccess={() => {
            setDeleteUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}