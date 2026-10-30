import { InvitationsClient } from "@/components/admin/sections/invitations/InvitationsClient";

export const metadata = {
  title: "Invitations | Riwainvite Admin",
};

export default function InvitationsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
          Invitations
        </h1>
        <p className="text-gray-500 font-[family-name:var(--font-body)]">
          Monitor the event pages your users have created and published.
        </p>
      </div>
      
      <InvitationsClient />
    </div>
  );
}