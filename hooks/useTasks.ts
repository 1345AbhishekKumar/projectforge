import { useQuery } from "@tanstack/react-query";
import { getOrganizationTasks } from "@/actions/task";

export function useTasks(orgId: string | null) {
  return useQuery({
    queryKey: ["orgTasks", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await getOrganizationTasks(orgId);
      if (!res.success) throw new Error(res.error || "Failed to fetch tasks");
      return res.data || [];
    },
    enabled: !!orgId,
  });
}
