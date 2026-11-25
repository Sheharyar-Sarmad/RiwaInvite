"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Send } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import {
  BTN,
  ErrorCard,
  HEADING,
  cn,
  fetcher,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import {
  CreateInvitationModal,
  InvitationCard,
  InvitationGridSkeleton,
  QuickEditModal,
  type Invitation,
  type PurchasedTemplate,
  type QuickEditValues,
} from "./ui/InvitationUI";
import { usePlanAllowance } from "@/components/user/sections/rehearsal/usePlanAllowance"; // SLUG

type Rec = Record<string, any>;

const API = {
  invitations: "/user/dashboard/invitations",
  invitation: (id: string) =>
    `/user/dashboard/invitations/${encodeURIComponent(id)}`,
  library: "/user/dashboard/library",
  publicTemplate: (id: string) => `/public/template/${encodeURIComponent(id)}`,
} as const;

const LIST_ROUTE = "/dashboard/invitations";
const UUID_RE = /^[\w-]{1,64}$/;
const LIBRARY_PAGE = 12;
const LIBRARY_MAX_PAGES = 20;

/** Loads the whole (small) library once. Only runs when the modal needs it. */
async function loadLibrary(): Promise<PurchasedTemplate[]> {
  const all: PurchasedTemplate[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await apiClient.get(API.library, {
      params: { page, limit: LIBRARY_PAGE },
    });
    const payload = (res.data?.data ?? res.data) as Rec | null;
    const rows = Array.isArray(payload?.items) ? (payload!.items as Rec[]) : [];
    for (const t of rows) {
      if (!t || typeof t.id !== "string") continue;
      all.push({
        id: t.id,
        name: typeof t.name === "string" && t.name ? t.name : "Untitled",
        thumbnail_url:
          typeof t.thumbnail_url === "string" ? t.thumbnail_url : "",
        has_custom_slug: Boolean(t.has_custom_slug),
        allows_custom_slug: Boolean(t.allows_custom_slug),
        status: typeof t.status === "string" ? t.status : undefined,
      });
    }
    totalPages = Number(payload?.meta?.total_pages) || 1;
    page += 1;
  } while (page <= totalPages && page <= LIBRARY_MAX_PAGES);
  return all;
}

function toInvitations(data: unknown): Invitation[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as Rec | null)?.items)
      ? (data as Rec).items
      : [];
  return rows.filter((r: Rec) => r && typeof r.id === "string") as Invitation[];
}

export function InvitationsClient(_props: { user?: unknown }) {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <Inner />
    </React.Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-12 w-64 animate-pulse rounded-xl bg-stone-200/70" />
      <InvitationGridSkeleton />
    </div>
  );
}

const CALM = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60_000,
  errorRetryCount: 2,
} as const;

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract BOTH parameters to prevent route collision
  const rawTemplate = searchParams.get("template");
  const rawInvitation = searchParams.get("invitation");

  const templateParam =
    rawTemplate && UUID_RE.test(rawTemplate) ? rawTemplate : null;
  const invitationParam =
    rawInvitation && UUID_RE.test(rawInvitation) ? rawInvitation : null;

  const [createOpen, setCreateOpen] = React.useState(!!templateParam);
  const [libWanted, setLibWanted] = React.useState(!!templateParam);
  const [editingId, setEditingId] = React.useState<string | null>(
    invitationParam,
  );

  // Sync state with URL params (handles back/forward browser navigation)
  React.useEffect(() => {
    if (templateParam) {
      setLibWanted(true);
      setCreateOpen(true);
    }
    if (invitationParam) {
      setEditingId(invitationParam);
    }
  }, [templateParam, invitationParam]);

  const {
    data: invData,
    error: invError,
    mutate: mutateInvitations,
    isLoading: invLoading,
  } = useSWR<unknown>(API.invitations, fetcher, CALM);

  const {
    data: library,
    error: libError,
    isLoading: libLoading,
    mutate: retryLibrary,
  } = useSWR<PurchasedTemplate[]>(
    libWanted ? "invitations:library" : null,
    loadLibrary,
    CALM,
  );

  // SLUG: plan allowance + "ask for a custom link?" check
  const allowance = usePlanAllowance();

  /** From the plan (not bought) AND the plan allows a custom link. */
  const askSlugFor = React.useCallback(
    (id: string) =>
      !!allowance.data?.subscription?.allowsCustomSlug &&
      allowance.data.unlocked.some((u) => u.id === id),
    [allowance.data],
  );
  // FALLBACK: If SWR cache is stale and missing the newly purchased template, fetch it directly
  const [fallbackTemplate, setFallbackTemplate] =
    React.useState<PurchasedTemplate | null>(null);
  const [fetchingFallback, setFetchingFallback] = React.useState(false);

  React.useEffect(() => {
    if (
      templateParam &&
      !libLoading &&
      (!library || !library.some((t) => t.id === templateParam))
    ) {
      setFetchingFallback(true);
      apiClient
        .get(API.publicTemplate(templateParam))
        .then((res) => {
          const t = res.data?.data;
          if (t) {
            setFallbackTemplate({
              id: t.id,
              name: t.name,
              thumbnail_url: t.thumbnail_url,
              has_custom_slug: false, // Assume false for fallback, backend enforces truth
              allows_custom_slug: t.allows_custom_slug || false,
              status: t.status,
            });
          }
        })
        .catch(console.error)
        .finally(() => setFetchingFallback(false));
    }
  }, [templateParam, library, libLoading]);

  const finalTemplates = React.useMemo(() => {
    const list = library ?? [];
    if (fallbackTemplate && !list.some((t) => t.id === fallbackTemplate.id)) {
      return [...list, fallbackTemplate];
    }
    return list;
  }, [library, fallbackTemplate]);

  const openCreate = () => {
    setLibWanted(true);
    setCreateOpen(true);
  };

  const closeCreateModal = React.useCallback(() => {
    setCreateOpen(false);
    if (templateParam) router.replace(LIST_ROUTE, { scroll: false });
  }, [router, templateParam]);

  const closeEditModal = React.useCallback(() => {
    setEditingId(null);
    if (invitationParam) router.replace(LIST_ROUTE, { scroll: false });
  }, [router, invitationParam]);

  // SLUG: optional custom_slug is sent only when the user picked one
  const handleCreate = async (templateId: string, slug?: string | null) => {
    const res = await apiClient.post(API.invitations, {
      template_id: templateId,
      ...(slug ? { custom_slug: slug } : {}),
    });
    await mutateInvitations();
    const existed = Boolean(res.data?.existed);
    toast.add({
      title: existed ? "Already created" : "Invitation created",
      description: existed
        ? "You already have an invitation for this template."
        : "It’s ready to share.",
      type: "success",
    });
    closeCreateModal();
  };

  const appUrl = React.useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );
  const invitations = React.useMemo(() => toInvitations(invData), [invData]);

  const usedTemplateIds = React.useMemo(
    () =>
      new Set(
        invitations.map((i) => i.template_id).filter(Boolean) as string[],
      ),
    [invitations],
  );

  const editing = React.useMemo(
    () =>
      editingId ? (invitations.find((i) => i.id === editingId) ?? null) : null,
    [editingId, invitations],
  );

  const handleQuickSave = async (id: string, values: QuickEditValues) => {
    await apiClient.patch(API.invitation(id), {
      title: values.title,
      event_date: values.event_date,
      status: values.status, // <-- Pass the Draft/Live status
    });
    await mutateInvitations();
    toast.add({
      title: "Saved",
      description: "Your invitation details were updated.",
      type: "success",
    });
    closeEditModal();
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className={cn(HEADING, "text-2xl text-[#1c1410] sm:text-3xl")}>
            My <span className="text-orange-600">invitations</span>
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Manage your live events and share links.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={cn(BTN, "h-10 px-5", FOCUS)}
        >
          <Plus className="size-4" /> New invitation
        </button>
      </div>

      {invError && !invData ? (
        <ErrorCard onRetry={() => void mutateInvitations()} />
      ) : invLoading && !invData ? (
        <InvitationGridSkeleton />
      ) : invitations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-10 text-center sm:p-12">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-100">
            <Send className="size-5 text-orange-500" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-[#1c1410]">
            No invitations yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
            Pick a template from your library. You can customise it in the
            Rehearsal Studio first.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={openCreate}
              className={cn(BTN, "h-10 px-5", FOCUS)}
            >
              Create your first invitation
            </button>
            <Link
              href="/dashboard/rehearsal"
              className={cn(
                "inline-flex h-10 items-center rounded-xl border border-black/[0.08] bg-white px-5 text-sm font-semibold text-stone-700 hover:bg-stone-50",
                FOCUS,
              )}
            >
              Open Rehearsal Studio
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {invitations.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              appUrl={appUrl}
              onQuickEdit={() => setEditingId(inv.id)}
            />
          ))}
        </ul>
      )}

      <CreateInvitationModal
        open={createOpen}
        onClose={closeCreateModal}
        templates={finalTemplates}
        usedTemplateIds={usedTemplateIds}
        loading={
          libWanted &&
          (libLoading || fetchingFallback || allowance.status === "loading")
        } // SLUG
        failed={!!libError}
        onRetry={() => void retryLibrary()}
        initialTemplateId={templateParam}
        askSlugFor={askSlugFor} // SLUG
        onCreate={handleCreate}
      />

      <QuickEditModal
        invitation={editing}
        onClose={closeEditModal}
        onSave={handleQuickSave}
      />
    </div>
  );
}

export default InvitationsClient;
