"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { SearchResult, SavedSearch } from "@/types";
import { verifyMembership, getOrganizationMemberships } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const searchFiltersSchema = z.object({
  projectIds: z.array(z.string().uuid()).optional(),
  statuses: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});

const advancedSearchInputSchema = z.object({
  query: z.string().max(100, "Search query too long").default(""),
  filters: searchFiltersSchema.optional(),
  orgId: z.string().uuid("Invalid organization ID"),
});

const savedSearchInputSchema = z.object({
  name: z.string().min(3, "Saved search name must be at least 3 characters").max(50),
  queryText: z.string().optional(),
  filters: searchFiltersSchema.optional(),
  orgId: z.string().uuid("Invalid organization ID"),
});

export async function advancedSearch(
  query: string,
  filters: z.infer<typeof searchFiltersSchema> | undefined,
  orgId: string
): Promise<{ success: boolean; data?: SearchResult; error?: string }> {
  const validated = advancedSearchInputSchema.safeParse({ query, filters, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const searchTerm = validated.data.query.trim();
    const filterData = validated.data.filters || {};

    // 1. Fetch task IDs matching the filters
    let taskQuery = insforge.database
      .from("tasks")
      .select("id, title, status, priority, project_id, assignee_id, created_at")
      .eq("organization_id", validated.data.orgId);

    if (filterData.projectIds && filterData.projectIds.length > 0) {
      taskQuery = taskQuery.in("project_id", filterData.projectIds);
    }
    if (filterData.statuses && filterData.statuses.length > 0) {
      taskQuery = taskQuery.in("status", filterData.statuses);
    }
    if (filterData.priorities && filterData.priorities.length > 0) {
      taskQuery = taskQuery.in("priority", filterData.priorities);
    }
    if (filterData.assignees && filterData.assignees.length > 0) {
      taskQuery = taskQuery.in("assignee_id", filterData.assignees);
    }
    if (filterData.dateRange?.start) {
      taskQuery = taskQuery.gte("created_at", filterData.dateRange.start);
    }
    if (filterData.dateRange?.end) {
      taskQuery = taskQuery.lte("created_at", filterData.dateRange.end);
    }

    // Labels filtering
    if (filterData.labelIds && filterData.labelIds.length > 0) {
      const { data: mappings, error: labelError } = await insforge.database
        .from("task_label_mappings")
        .select("task_id")
        .in("label_id", filterData.labelIds);

      if (labelError) {
        logger.error({ error: labelError }, "Error fetching task label mappings");
        return { success: false, error: "Failed to query task label mappings" };
      }

      const taskIdsWithLabels = (mappings || []).map((m: { task_id: string }) => m.task_id);
      if (taskIdsWithLabels.length === 0) {
        return {
          success: true,
          data: {
            projects: [],
            tasks: [],
            members: [],
            comments: [],
            attachments: [],
            activities: [],
          },
        };
      }
      taskQuery = taskQuery.in("id", taskIdsWithLabels);
    }

    const { data: filteredTasks, error: taskQueryError } = await taskQuery;
    if (taskQueryError) {
      logger.error({ error: taskQueryError }, "Error filtering tasks");
      return { success: false, error: "Failed to filter tasks" };
    }

    const taskIds = (filteredTasks || []).map((t: { id: string }) => t.id);

    const hasFilters = (filterData.projectIds && filterData.projectIds.length > 0) ||
                      (filterData.statuses && filterData.statuses.length > 0) ||
                      (filterData.priorities && filterData.priorities.length > 0) ||
                      (filterData.assignees && filterData.assignees.length > 0) ||
                      (filterData.labelIds && filterData.labelIds.length > 0) ||
                      filterData.dateRange?.start ||
                      filterData.dateRange?.end;

    if (hasFilters && taskIds.length === 0) {
      // Only search projects if no tasks match
      let projQuery = insforge.database
        .from("projects")
        .select("id, name, description, status")
        .eq("organization_id", validated.data.orgId);
      if (filterData.projectIds && filterData.projectIds.length > 0) {
        projQuery = projQuery.in("id", filterData.projectIds);
      }
      if (searchTerm) {
        projQuery = projQuery.ilike("name", `%${searchTerm}%`);
      }
      const { data: projectsData } = await projQuery;
      return {
        success: true,
        data: {
          projects: projectsData || [],
          tasks: [],
          members: [],
          comments: [],
          attachments: [],
          activities: [],
        },
      };
    }

    const queries = [];

    // Query 1: Projects search
    let projectsQuery = insforge.database
      .from("projects")
      .select("id, name, description, status")
      .eq("organization_id", validated.data.orgId);
    if (filterData.projectIds && filterData.projectIds.length > 0) {
      projectsQuery = projectsQuery.in("id", filterData.projectIds);
    }
    if (searchTerm) {
      projectsQuery = projectsQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }
    queries.push(projectsQuery.limit(10));

    // Query 2: Tasks search
    let tasksSearchQuery = insforge.database
      .from("tasks")
      .select("id, title, status, priority, project_id")
      .eq("organization_id", validated.data.orgId);
    if (taskIds.length > 0) {
      tasksSearchQuery = tasksSearchQuery.in("id", taskIds);
    }
    if (searchTerm) {
      tasksSearchQuery = tasksSearchQuery.textSearch("title", searchTerm, { type: "plain" });
    }
    queries.push(tasksSearchQuery.limit(10));

    // Query 3: Members search
    queries.push(getOrganizationMemberships(insforge, validated.data.orgId, 50));

    // Query 4: Comments search
    let commentsQuery = insforge.database
      .from("comments")
      .select("id, task_id, content, created_at, task:tasks(title, project_id)");
    if (taskIds.length > 0) {
      commentsQuery = commentsQuery.in("task_id", taskIds);
    } else {
      const { data: allOrgTasks } = await insforge.database
        .from("tasks")
        .select("id")
        .eq("organization_id", validated.data.orgId);
      const allOrgTaskIds = (allOrgTasks || []).map((t: { id: string }) => t.id);
      commentsQuery = commentsQuery.in("task_id", allOrgTaskIds.length > 0 ? allOrgTaskIds : ["00000000-0000-0000-0000-000000000000"]);
    }
    if (searchTerm) {
      commentsQuery = commentsQuery.ilike("content", `%${searchTerm}%`);
    }
    queries.push(commentsQuery.limit(10));

    // Query 5: Attachments search
    let attachmentsQuery = insforge.database
      .from("attachments")
      .select("id, task_id, file_name, file_url, created_at, task:tasks(title, project_id)");
    if (taskIds.length > 0) {
      attachmentsQuery = attachmentsQuery.in("task_id", taskIds);
    } else {
      const { data: allOrgTasks } = await insforge.database
        .from("tasks")
        .select("id")
        .eq("organization_id", validated.data.orgId);
      const allOrgTaskIds = (allOrgTasks || []).map((t: { id: string }) => t.id);
      attachmentsQuery = attachmentsQuery.in("task_id", allOrgTaskIds.length > 0 ? allOrgTaskIds : ["00000000-0000-0000-0000-000000000000"]);
    }
    if (searchTerm) {
      attachmentsQuery = attachmentsQuery.ilike("file_name", `%${searchTerm}%`);
    }
    queries.push(attachmentsQuery.limit(10));

    // Query 6: Activities search
    let activitiesQuery = insforge.database
      .from("activities")
      .select(`
        id, organization_id, project_id, user_id, action_type, metadata, created_at,
        actor:profiles(full_name, avatar_url)
      `)
      .eq("organization_id", validated.data.orgId);
    if (filterData.projectIds && filterData.projectIds.length > 0) {
      activitiesQuery = activitiesQuery.in("project_id", filterData.projectIds);
    }
    if (filterData.dateRange?.start) {
      activitiesQuery = activitiesQuery.gte("created_at", filterData.dateRange.start);
    }
    if (filterData.dateRange?.end) {
      activitiesQuery = activitiesQuery.lte("created_at", filterData.dateRange.end);
    }
    if (searchTerm) {
      activitiesQuery = activitiesQuery.or(`action_type.ilike.%${searchTerm}%`);
    }
    queries.push(activitiesQuery.limit(10));

    const [
      projectsRes,
      tasksRes,
      membersRes,
      commentsRes,
      attachmentsRes,
      activitiesRes,
    ] = await Promise.all(queries);

    if (projectsRes.error) {
      logger.error({ error: projectsRes.error }, "Search projects error");
      return { success: false, error: "Failed to search projects" };
    }
    if (tasksRes.error) {
      logger.error({ error: tasksRes.error }, "Search tasks error");
      return { success: false, error: "Failed to search tasks" };
    }
    if (membersRes.error) {
      logger.error({ error: membersRes.error }, "Search members error");
      return { success: false, error: "Failed to search members" };
    }
    if (commentsRes.error) {
      logger.error({ error: commentsRes.error }, "Search comments error");
      return { success: false, error: "Failed to search comments" };
    }
    if (attachmentsRes.error) {
      logger.error({ error: attachmentsRes.error }, "Search attachments error");
      return { success: false, error: "Failed to search attachments" };
    }
    if (activitiesRes.error) {
      logger.error({ error: activitiesRes.error }, "Search activities error");
      return { success: false, error: "Failed to search activities" };
    }

    type RawMembership = {
      user_id: string;
      role: string;
      profiles: { full_name: string | null; avatar_url: string | null; email: string }[] | null;
    };
    const lowerQuery = searchTerm.toLowerCase();
    const filteredMembers = (membersRes.data as unknown as RawMembership[] || [])
      .filter((m) => {
        const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] : null;
        const name = profile?.full_name?.toLowerCase() || "";
        const email = profile?.email?.toLowerCase() || "";
        return name.includes(lowerQuery) || email.includes(lowerQuery);
      })
      .map((m) => {
        const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] : null;
        return {
          user_id: m.user_id,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          role: m.role as "OWNER" | "ADMIN" | "MEMBER",
        };
      })
      .slice(0, 10);

    interface DBCommentRow {
      id: string;
      task_id: string;
      content: string;
      created_at: string;
      task: { title: string; project_id: string } | null;
    }

    interface DBAttachmentRow {
      id: string;
      task_id: string;
      file_name: string;
      file_url: string;
      created_at: string;
      task: { title: string; project_id: string } | null;
    }

    interface DBActivityRow {
      id: string;
      organization_id: string;
      project_id: string | null;
      user_id: string;
      action_type: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
      actor: { full_name: string | null; avatar_url: string | null }[] | null;
    }

    const formattedComments = (commentsRes.data as unknown as DBCommentRow[] || []).map((c) => ({
      id: c.id,
      task_id: c.task_id,
      content: c.content,
      created_at: c.created_at,
      task_title: c.task?.title,
      project_id: c.task?.project_id,
    }));

    const formattedAttachments = (attachmentsRes.data as unknown as DBAttachmentRow[] || []).map((a) => ({
      id: a.id,
      task_id: a.task_id,
      file_name: a.file_name,
      file_url: a.file_url,
      created_at: a.created_at,
      task_title: a.task?.title,
      project_id: a.task?.project_id,
    }));

    const formattedActivities = (activitiesRes.data as unknown as DBActivityRow[] || []).map((act) => ({
      id: act.id,
      organization_id: act.organization_id,
      project_id: act.project_id,
      user_id: act.user_id,
      action_type: act.action_type,
      metadata: act.metadata,
      created_at: act.created_at,
      actor: act.actor && act.actor.length > 0 ? act.actor[0] : null,
    }));

    return {
      success: true,
      data: {
        projects: projectsRes.data || [],
        tasks: tasksRes.data || [],
        members: filteredMembers,
        comments: formattedComments,
        attachments: formattedAttachments,
        activities: formattedActivities,
      },
    };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in advancedSearch");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function globalSearch(
  query: string,
  orgId: string
): Promise<{ success: boolean; data?: SearchResult; error?: string }> {
  return advancedSearch(query, {}, orgId);
}

export async function saveSearch(
  name: string,
  queryText: string,
  filters: z.infer<typeof searchFiltersSchema> | undefined,
  orgId: string
): Promise<{ success: boolean; data?: SavedSearch; error?: string }> {
  const validated = savedSearchInputSchema.safeParse({ name, queryText, filters, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { data, error } = await insforge.database
      .from("saved_searches")
      .insert([
        {
          user_id: userId,
          organization_id: validated.data.orgId,
          name: validated.data.name,
          query_text: validated.data.queryText || "",
          filters: validated.data.filters || {},
        },
      ])
      .select("*")
      .single();

    if (error) {
      logger.error({ error, orgId }, "Failed to save search");
      return { success: false, error: "Failed to save search" };
    }

    return { success: true, data: data as unknown as SavedSearch };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in saveSearch");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getSavedSearches(orgId: string): Promise<{ success: boolean; data: SavedSearch[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace", data: [] };

    const { data, error } = await insforge.database
      .from("saved_searches")
      .select("*")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error, orgId }, "Failed to fetch saved searches");
      return { success: false, error: "Failed to fetch saved searches", data: [] };
    }

    return { success: true, data: (data || []) as unknown as SavedSearch[] };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getSavedSearches");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteSavedSearch(id: string, orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { error } = await insforge.database
      .from("saved_searches")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId)
      .eq("user_id", userId);

    if (error) {
      logger.error({ error, id }, "Failed to delete saved search");
      return { success: false, error: "Failed to delete saved search" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, id }, "Unexpected error in deleteSavedSearch");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

