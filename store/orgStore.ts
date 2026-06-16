import { create } from "zustand";
import type { OrganizationWithRole, MembershipRole } from "@/types";

type OrgState = {
  activeOrgId: string | null;
  activeOrgName: string;
  userRole: MembershipRole | null;
  orgs: OrganizationWithRole[];
  setActiveOrg: (id: string, name: string, role: MembershipRole) => void;
  setOrgs: (orgs: OrganizationWithRole[]) => void;
  clearOrg: () => void;
};

const getCookieActiveOrgId = (): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/active_org_id=([^;]+)/);
  return match ? match[1] : null;
};

export const useOrgStore = create<OrgState>((set) => ({
  activeOrgId: getCookieActiveOrgId(),
  activeOrgName: "",
  userRole: null,
  orgs: [],
  setActiveOrg: (id, name, role) => set({ activeOrgId: id, activeOrgName: name, userRole: role }),
  setOrgs: (orgs) => {
    set((state) => {
      const activeId = state.activeOrgId || (orgs.length > 0 ? orgs[0].id : null);
      const activeOrg = orgs.find((o) => o.id === activeId);
      return {
        orgs,
        activeOrgId: activeId,
        activeOrgName: activeOrg ? activeOrg.name : "",
        userRole: activeOrg ? activeOrg.role : null,
      };
    });
  },
  clearOrg: () => set({ activeOrgId: null, activeOrgName: "", userRole: null }),
}));
