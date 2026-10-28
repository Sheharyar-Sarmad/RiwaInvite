"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api/api_base";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UserListRow, UserAvatar } from "../sections/users/UsersClient";

export function UserSearchCommandModal({ isOpen, onClose, onSelectUser }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelectUser: (user: UserListRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserListRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/admin/dashboard/users?q=${query}&limit=5`);
        setResults(res.data.data.users);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* FIX APPLIED: Removed top-[20%] and translate-y-0 so it centers naturally */}
      <DialogContent className="p-0 gap-0 overflow-hidden border-orange-100/50 bg-white/80 backdrop-blur-2xl sm:max-w-[600px] shadow-2xl rounded-2xl [&>button]:cursor-pointer">
        <DialogTitle className="sr-only">Search Users</DialogTitle>
        
        <div className="flex items-center px-4 py-3 pr-14 border-b border-gray-100/50">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-orange-500 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to a user..."
            className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400 px-3 text-lg w-full"
          />
          <button 
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex shrink-0 items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-orange-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <AnimatePresence>
            {results.length > 0 ? (
              results.map((user) => (
                <motion.button
                  key={user.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onSelectUser(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50/80 transition-colors text-left group cursor-pointer"
                >
                  <UserAvatar firstName={user.first_name} lastName={user.last_name} />
                  <div className="flex-1 flex flex-col">
                    <span className="font-semibold text-gray-900 text-sm">{user.first_name} {user.last_name}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))
            ) : query.trim() && !isLoading ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                No results found for "{query}"
              </div>
            ) : !query.trim() ? (
              <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center gap-2">
                <Search className="w-8 h-8 text-gray-300 mb-2" />
                Type a name or email to search users...
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}