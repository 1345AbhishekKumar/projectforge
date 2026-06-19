import { createInsforgeServer } from "../insforge-server";
import { logger } from "../logger";

// In-memory Map mapping organization_id -> Set of active trigger names
const triggerCache = new Map<string, Set<string>>();

/**
 * Checks if a specific trigger is active (has enabled workflows) for an organization.
 * If the cache is cold, it loads the active triggers from the database.
 */
export async function isTriggerActive(
  orgId: string,
  trigger: string,
  userId: string
): Promise<boolean> {
  let activeTriggers = triggerCache.get(orgId);

  if (!activeTriggers) {
    activeTriggers = await loadActiveTriggers(orgId, userId);
  }

  return activeTriggers.has(trigger);
}

/**
 * Loads active triggers for an organization from the database and caches them.
 */
export async function loadActiveTriggers(
  orgId: string,
  userId: string
): Promise<Set<string>> {
  try {
    const insforge = createInsforgeServer(userId);
    const { data, error } = await insforge.database
      .from("workflows")
      .select("trigger")
      .eq("organization_id", orgId)
      .eq("enabled", true);

    if (error) {
      logger.error({ error, orgId, userId }, "Failed to load active triggers from database");
      return new Set<string>();
    }

    const triggerSet = new Set<string>(data?.map((w: { trigger: string }) => w.trigger) || []);
    triggerCache.set(orgId, triggerSet);
    return triggerSet;
  } catch (error) {
    logger.error({ error, orgId, userId }, "Unexpected error loading active triggers");
    return new Set<string>();
  }
}

/**
 * Evicts the cached triggers for an organization, forcing a reload on the next check.
 */
export function invalidateTriggerCache(orgId: string): void {
  triggerCache.delete(orgId);
}

/**
 * Clears the entire trigger cache. Useful for testing.
 */
export function clearTriggerCache(): void {
  triggerCache.clear();
}
