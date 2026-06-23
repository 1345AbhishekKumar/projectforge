import { useQuery } from "@tanstack/react-query";
import { getUserProjects } from "@/actions/project";

export function useProjects(orgId: string | null) {
  return useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await getUserProjects(orgId);
      if (!res.success) throw new Error(res.error || "Failed to fetch projects");
      return res.data || [];
    },
    enabled: !!orgId,
  });
}
