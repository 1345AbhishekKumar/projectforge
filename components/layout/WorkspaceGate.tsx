"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { getUserOrganizations, setActiveOrganization } from "@/actions/org";
import { useOrgStore } from "@/store/orgStore";

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { setOrgs, orgs, activeOrgId } = useOrgStore();
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const isWorkspaceRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/sprints") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/organizations") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications");

  // Derive checking state to avoid synchronous useEffect setStates
  const shouldCheck = isLoaded && !!user && isWorkspaceRoute && orgs.length === 0;
  const checking = shouldCheck || loadingOrgs;

  useEffect(() => {
    if (!shouldCheck) return;

    async function checkOrgs() {
      setLoadingOrgs(true);
      try {
        const res = await getUserOrganizations();
        if (res.success && res.data) {
          setOrgs(res.data);
          
          if (res.data.length === 0) {
            router.push("/orgs/create");
            return;
          }

          // If we have organizations, ensure the active org cookie is set
          const activeId = activeOrgId || (res.data.length > 0 ? res.data[0].id : null);
          const hasCookie = typeof document !== "undefined" && document.cookie.includes("active_org_id=");
          if (activeId && !hasCookie) {
            await setActiveOrganization(activeId);
          }
        }
      } catch (err) {
        console.error("WorkspaceGate error:", err);
      } finally {
        setLoadingOrgs(false);
      }
    }

    checkOrgs();
  }, [shouldCheck, router, setOrgs, activeOrgId]);

  if (checking && orgs.length === 0 && user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading workspace context...</span>
      </div>
    );
  }

  return <>{children}</>;
}
