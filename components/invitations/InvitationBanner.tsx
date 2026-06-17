"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, Mail, CheckCircle, XCircle } from "lucide-react";
import { getPendingInvitations, acceptInvitation, declineInvitation, type PendingInvitation } from "@/actions/invitation";

export function InvitationBanner() {
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "decline" | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDeclineId, setConfirmDeclineId] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvites() {
      try {
        const res = await getPendingInvitations();
        if (res.success) {
          setInvites(res.data);
        }
      } catch (err) {
        console.error("Failed to load invitations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInvites();
  }, []);

  const showBanner = (type: "success" | "error", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  async function handleAccept(id: string, orgName: string) {
    setActionId(id);
    setActionType("accept");
    try {
      const res = await acceptInvitation(id);
      if (res.success) {
        showBanner("success", `Successfully joined workspace "${orgName}"!`);
        setInvites((prev) => prev.filter((inv) => inv.id !== id));
        // Force a window refresh to load the new organization in OrgSwitcher
        window.location.reload();
      } else {
        showBanner("error", res.error || "Failed to accept invitation");
      }
    } catch {
      showBanner("error", "An unexpected error occurred");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  }

  async function handleDecline(id: string, orgName: string) {
    if (confirmDeclineId !== id) {
      setConfirmDeclineId(id);
      return;
    }
    setConfirmDeclineId(null);
    setActionId(id);
    setActionType("decline");
    try {
      const res = await declineInvitation(id);
      if (res.success) {
        showBanner("success", `Declined invitation to join "${orgName}".`);
        setInvites((prev) => prev.filter((inv) => inv.id !== id));
      } else {
        showBanner("error", res.error || "Failed to decline invitation");
      }
    } catch {
      showBanner("error", "An unexpected error occurred");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  }

  if (loading || invites.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Toast Notification Banner */}
      {banner && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-[100] max-w-md border-2 border-black rounded-sketchy p-4 shadow-flat-offset transition-all transform ${
            banner.type === "success" ? "bg-accent-green" : "bg-accent-pink"
          }`}
        >
          <div className="flex items-center gap-2 font-sans font-bold text-sm">
            {banner.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-primary" />
            )}
            {banner.text}
          </div>
        </div>
      )}

      {invites.map((invite) => (
        <div
          key={invite.id}
          className="bg-accent-purple border-2 border-black rounded-sketchy p-5 shadow-flat-offset flex flex-col md:flex-row md:items-center justify-between gap-4 rotate-[0.5deg] text-primary"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white border-2 border-black rounded-full shrink-0 shadow-flat-offset-sm mt-0.5">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-cursive text-xl font-bold mb-1 text-white">Pending Workspace Invitation!</h3>
              <p className="font-sans text-xs text-white/95 leading-relaxed">
                You have been invited by <span className="font-semibold">{invite.invitedByName}</span> to join the workspace <span className="font-bold underline decoration-accent-yellow decoration-2">&ldquo;{invite.orgName}&rdquo;</span> as <span className="font-semibold uppercase">{invite.role.toLowerCase()}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
            <button
              onClick={() => handleAccept(invite.id, invite.orgName)}
              disabled={actionId !== null}
              className="inline-flex items-center gap-1.5 bg-accent-green hover:bg-[#A3E5A3] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 cursor-pointer"
            >
              {actionId === invite.id && actionType === "accept" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Accept
            </button>

            <button
              onClick={() => handleDecline(invite.id, invite.orgName)}
              disabled={actionId !== null}
              className="inline-flex items-center gap-1.5 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 cursor-pointer"
            >
              {actionId === invite.id && actionType === "decline" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              {confirmDeclineId === invite.id ? "Confirm Decline?" : "Decline"}
            </button>

            {confirmDeclineId === invite.id && (
              <button
                onClick={() => setConfirmDeclineId(null)}
                className="bg-white hover:bg-neutral-bg text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
