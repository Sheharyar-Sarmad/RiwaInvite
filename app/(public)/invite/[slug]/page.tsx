// app/invite/[slug]/page.tsx
import type { Metadata } from "next";
import { getPublicInvitation } from "@/lib/invitations/public-invitation";
import { PublicInvitationClient } from "@/components/public/invitation/PublicInvitationClient";
import { InvitationNotice } from "@/components/public/invitation/PublicInvitationUI";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const base: Metadata = { robots: { index: false, follow: false } };
  try {
    const r = await getPublicInvitation(slug);
    if (r.state !== "ok") return { ...base, title: "Invitation" };
    const d = r.invitation.designSchema;
    const names = [d?.coreNames?.bride, d?.coreNames?.groom].filter(Boolean).join(" & ");
    const title = names || r.invitation.title || "You're invited";
    const gallery: unknown = Array.isArray(d?.galleryUrls) ? d.galleryUrls[0] : null;
    const image =
      [d?.thumbnailUrl, gallery].find((u) => typeof u === "string" && /^https:\/\//i.test(u)) ?? undefined;
    return {
      ...base,
      title: `${title} · Invitation`,
      description: "You're invited. Tap to open your invitation.",
      openGraph: { title, description: "You're invited.", images: image ? [{ url: image }] : undefined },
      twitter: { card: image ? "summary_large_image" : "summary", title },
    };
  } catch {
    return base;
  }
}

export default async function InvitePage({ params }: Props) {
  const { slug } = await params;
  const r = await getPublicInvitation(slug);

  if (r.state === "missing") return <InvitationNotice kind="missing" />;
  if (r.state === "expired") return <InvitationNotice kind="expired" />;

  return <PublicInvitationClient invitation={r.invitation} />;
}