"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { ArrowLeft, Building2, LogOut, User as UserIcon, Loader2 } from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MemberList } from "@/components/orgs/MemberList";
import { InviteModal } from "@/components/orgs/InviteModal";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  getOrganizationMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  type MemberListItem,
} from "@/actions/membership";
import { getUserOrganizations } from "@/actions/org";

function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/active_org_id=([^;]+)/);
  return match ? match[1] : null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const initialOrgId = getActiveOrgId();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(initialOrgId);
  const [activeOrgName, setActiveOrgName] = useState<string>("");
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(!!initialOrgId);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Sync active organization ID and name on load & when cookie changes
  useEffect(() => {
    async function loadOrgInfo() {
      const orgId = getActiveOrgId();
      setActiveOrgId(orgId);

      if (orgId) {
        const result = await getUserOrganizations();
        if (result.success) {
          const currentOrg = result.data.find((o) => o.id === orgId);
          if (currentOrg) {
            setActiveOrgName(currentOrg.name);
          }
        }
      }
    }

    loadOrgInfo();
  }, []);

  // Fetch members when activeOrgId updates
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadMembers() {
      setLoadingMembers(true);
      setError("");
      const result = await getOrganizationMembers(activeOrgId!);
      if (result.success) {
        setMembers(result.data);
      } else {
        setError(result.error || "Failed to load members");
      }
      setLoadingMembers(false);
    }

    loadMembers();
  }, [activeOrgId]);

  // Handle workspace switcher updates
  // Since switching active org modifies the cookie, we scan for it and refresh page states
  const handleRefreshState = useCallback(() => {
    const orgId = getActiveOrgId();
    if (orgId !== activeOrgId) {
      setActiveOrgId(orgId);
      if (!orgId) {
        setMembers([]);
        setLoadingMembers(false);
        setActiveOrgName("");
      } else {
        // Fetch org details again
        getUserOrganizations().then((result) => {
          if (result.success) {
            const currentOrg = result.data.find((o) => o.id === orgId);
            if (currentOrg) {
              setActiveOrgName(currentOrg.name);
            }
          }
        });
      }
    }
  }, [activeOrgId]);

  // Listen to switcher click updates (cookie updates router)
  useEffect(() => {
    const interval = setInterval(handleRefreshState, 1000);
    return () => clearInterval(interval);
  }, [handleRefreshState]);

  // Action callbacks passed to subcomponents
  async function handleInvite(email: string, role: "ADMIN" | "MEMBER") {
    if (!activeOrgId) return { success: false, error: "No active workspace selected" };
    const res = await inviteMember(activeOrgId, email, role);
    if (res.success) {
      // Reload members list
      const membersRes = await getOrganizationMembers(activeOrgId);
      if (membersRes.success) setMembers(membersRes.data);
    }
    return res;
  }

  async function handleUpdateRole(membershipId: string, newRole: "ADMIN" | "MEMBER") {
    if (!activeOrgId) return;
    const res = await updateMemberRole(membershipId, activeOrgId, newRole);
    if (res.success) {
      // Reload members
      const membersRes = await getOrganizationMembers(activeOrgId);
      if (membersRes.success) setMembers(membersRes.data);
    } else {
      alert(res.error || "Failed to update role");
    }
  }

  async function handleRemoveMember(membershipId: string) {
    if (!activeOrgId) return;
    const res = await removeMember(membershipId, activeOrgId);
    if (res.success) {
      // Reload members
      const membersRes = await getOrganizationMembers(activeOrgId);
      if (membersRes.success) setMembers(membersRes.data);
    } else {
      alert(res.error || "Failed to remove member");
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading settings...</span>
      </div>
    );
  }

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const currentUserRole = currentUserMember?.role || "MEMBER";

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <header className="w-full bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            {/* Brand Logo - Mobile only */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold shadow-flat-offset-sm">
                P
              </div>
              <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
            </div>

            {/* Org Switcher - Mobile only */}
            <div className="md:hidden">
              <OrgSwitcher />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-neutral-bg">
              <UserIcon className="h-4 w-4 text-secondary" />
              <span className="font-sans text-xs font-semibold text-secondary">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

      {/* Main Settings Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {!activeOrgId ? (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
            <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
            <p className="font-sans text-sm text-secondary mb-6">
              Please select or create an organization workspace to manage settings and memberships.
            </p>
            <button
              onClick={() => router.push("/orgs/create")}
              className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Create New Workspace
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Header info card */}
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-cursive text-3xl font-bold mb-1">
                  Workspace Settings: <span className="underline decoration-tertiary decoration-2">{activeOrgName}</span>
                </h1>
                <p className="font-sans text-xs text-secondary">
                  Organization ID: <code className="bg-neutral-bg px-1 py-0.5 rounded border border-black/10">{activeOrgId}</code>
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="font-sans text-xs text-secondary font-semibold">Your Role:</span>
                <span className="bg-accent-purple text-white border-2 border-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {currentUserRole}
                </span>
              </div>
            </div>

            {/* Content panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Members List (Left panel) */}
              <div className="lg:col-span-2">
                {loadingMembers ? (
                  <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
                    <span className="font-cursive text-xl">Loading members list...</span>
                  </div>
                ) : error ? (
                  <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-4 text-center">
                    <p className="font-sans text-sm font-semibold">{error}</p>
                  </div>
                ) : (
                  <MemberList
                    members={members}
                    currentUserId={user?.id || ""}
                    currentUserRole={currentUserRole}
                    onUpdateRole={handleUpdateRole}
                    onRemoveMember={handleRemoveMember}
                  />
                )}
              </div>

              {/* Invite panel (Right panel) - only shown to owners & admins */}
              {(currentUserRole === "OWNER" || currentUserRole === "ADMIN") && (
                <div className="lg:col-span-1">
                  <InviteModal onInvite={handleInvite} />
                </div>
              )}
            </div>

            {/* Notification Preferences — full width below members */}
            <NotificationPreferences />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
