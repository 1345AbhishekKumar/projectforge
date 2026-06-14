"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUserOrganizations, setActiveOrganization } from "@/actions/org";
import { ChevronDown, Plus, Building2 } from "lucide-react";
import type { OrganizationWithRole } from "@/types";

function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/active_org_id=([^;]+)/);
  return match ? match[1] : null;
}

export function OrgSwitcher() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrganizationWithRole[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setActiveOrgId(getActiveOrgId());
      const result = await getUserOrganizations();
      if (result.success) setOrgs(result.data);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSwitch(orgId: string) {
    setOpen(false);
    const result = await setActiveOrganization(orgId);
    if (result.success) {
      setActiveOrgId(orgId);
      router.refresh();
    }
  }

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  if (loading) {
    return (
      <div className="h-9 w-40 bg-neutral-bg border-2 border-black rounded-full animate-pulse" />
    );
  }

  if (orgs.length === 0) {
    return (
      <button
        onClick={() => router.push("/orgs/create")}
        className="flex items-center gap-2 bg-accent-yellow border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Create Workspace
      </button>
    );
  }

  const roleBadgeColor: Record<string, string> = {
    OWNER: "bg-accent-purple text-white",
    ADMIN: "bg-accent-blue text-primary",
    MEMBER: "bg-accent-green text-primary",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer"
      >
        <Building2 className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate">
          {activeOrg?.name || "Select workspace"}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset z-50">
          <div className="p-2">
            <span className="font-sans text-[10px] font-bold uppercase text-secondary px-2 py-1 block">
              Workspaces
            </span>
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-sans text-sm transition-colors cursor-pointer ${
                  org.id === activeOrgId
                    ? "bg-neutral-bg font-semibold"
                    : "hover:bg-neutral-bg"
                }`}
              >
                <span className="truncate">{org.name}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    roleBadgeColor[org.role] || "bg-neutral-bg"
                  }`}
                >
                  {org.role}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t-2 border-black p-2">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/orgs/create");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md font-sans text-sm text-secondary hover:text-primary hover:bg-neutral-bg transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Create new workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
