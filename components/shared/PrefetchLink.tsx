"use client";

import Link, { LinkProps } from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import React, { useRef } from "react";

type PrefetchQuery = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  staleTime?: number;
};

type PrefetchLinkProps = Omit<React.ComponentPropsWithoutRef<"a">, keyof LinkProps> & LinkProps & {
  children: React.ReactNode;
  prefetchQueries: PrefetchQuery[];
};

// Global cache to track recently prefetched query keys during the session lifecycle
const prefetchedRegistry = new Set<string>();

export function PrefetchLink({ children, prefetchQueries, ...props }: PrefetchLinkProps) {
  const queryClient = useQueryClient();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPrefetch = () => {
    prefetchQueries.forEach(({ queryKey, queryFn, staleTime = 5 * 60 * 1000 }) => {
      const keyString = JSON.stringify(queryKey);
      
      // Prevent request storm if already prefetched recently in this session
      if (prefetchedRegistry.has(keyString)) return;

      // Check if query exists in React Query cache and is not stale
      const queryState = queryClient.getQueryState(queryKey);
      if (queryState && (Date.now() - queryState.dataUpdatedAt < staleTime)) {
        return;
      }

      prefetchedRegistry.add(keyString);
      
      // Fetch or return cached data
      queryClient.ensureQueryData({
        queryKey,
        queryFn,
        revalidateIfStale: false,
      }).catch(() => {
        // Remove from registry on failure so it can retry later
        prefetchedRegistry.delete(keyString);
      });
    });
  };

  const handleMouseEnter = () => {
    // Debounce prefetch slightly to avoid triggering on quick pointer sweeps
    prefetchTimeoutRef.current = setTimeout(triggerPrefetch, 60);
  };

  const handleMouseLeave = () => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
  };

  return (
    <Link
      {...props}
      prefetch={false} // Hover JS prefetching only
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={triggerPrefetch}
    >
      {children}
    </Link>
  );
}
