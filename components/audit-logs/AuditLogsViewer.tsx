"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, type AuditLogFilters as FiltersState } from "@/actions/auditLog";
import type { MemberListItem } from "@/actions/membership";
import { AuditLogFilters } from "./AuditLogFilters";
import { AuditLogsTable } from "./AuditLogsTable";
import { Loader2 } from "lucide-react";

type Props = {
  orgId: string;
  members: MemberListItem[];
};

export function AuditLogsViewer({ orgId, members }: Props) {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<FiltersState>({});

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["auditLogs", orgId, page, filters],
    queryFn: async () => {
      const res = await getAuditLogs(orgId, page, filters);
      if (!res.success) {
        throw new Error(res.error || "Failed to fetch audit logs");
      }
      return {
        logs: res.data,
        totalCount: res.totalCount,
      };
    },
    staleTime: 5000,
  });

  const handleFiltersChange = (newFilters: FiltersState) => {
    setFilters(newFilters);
    setPage(0); // Reset page on filter change
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(0);
  };

  const logs = data?.logs ?? [];
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <AuditLogFilters
        members={members}
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {isLoading ? (
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
            <span className="font-cursive text-lg font-bold">Loading audit history...</span>
          </div>
        </div>
      ) : (
        <div className={isPlaceholderData ? "opacity-60 pointer-events-none" : ""}>
          <AuditLogsTable
            logs={logs}
            members={members}
            page={page}
            totalCount={totalCount}
            pageSize={25} // DEFAULT_PAGE_SIZE is 25
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
