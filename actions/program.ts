"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Program, ProgramStatus } from "@/types";
import { orgIdSchema, uuidSchema } from "@/lib/utils";
import { verifyMembership, verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { getProgramMetrics, type ProgramRollupData } from "@/lib/portfolio-utils";

const programIdSchema = uuidSchema;
const portfolioIdSchema = uuidSchema;

const programInputSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  managerId: z.string().nullable().optional(),
});

const createProgramSchema = programInputSchema.extend({
  orgId: orgIdSchema,
  portfolioId: portfolioIdSchema,
});

const updateProgramSchema = programInputSchema.extend({
  programId: programIdSchema,
  orgId: orgIdSchema,
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

const deleteProgramSchema = z.object({
  programId: programIdSchema,
  orgId: orgIdSchema,
});

const linkProjectsSchema = z.object({
  programId: programIdSchema,
  orgId: orgIdSchema,
  projectIds: z.array(uuidSchema),
});

const unlinkProjectSchema = z.object({
  programId: programIdSchema,
  orgId: orgIdSchema,
  projectId: uuidSchema,
});

export async function createProgram(
  orgId: string,
  portfolioId: string,
  name: string,
  managerId: string | null = null
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  const validated = createProgramSchema.safeParse({ orgId, portfolioId, name, managerId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can create programs." };
    }

    const { data: program, error } = await insforge.database
      .from("programs")
      .insert([
        {
          portfolio_id: validated.data.portfolioId,
          name: validated.data.name,
          manager_id: validated.data.managerId || null,
          status: "ACTIVE",
        },
      ])
      .select("id")
      .single();

    if (error || !program) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to create program");
      return { success: false, error: "Failed to create program" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "program.created",
        "program",
        program.id,
        { name: validated.data.name }
      )
    );

    revalidatePath("/portfolios");
    revalidatePath(`/portfolios/${validated.data.portfolioId}`);
    return { success: true, data: { id: program.id } };
  } catch (err) {
    logger.error(err, "Unexpected error in createProgram Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updateProgram(
  orgId: string,
  programId: string,
  name: string,
  managerId: string | null,
  status: ProgramStatus
): Promise<{ success: boolean; error?: string }> {
  const validated = updateProgramSchema.safeParse({ orgId, programId, name, managerId, status });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can update programs." };
    }

    const { data: currentProgram } = await insforge.database
      .from("programs")
      .select("portfolio_id")
      .eq("id", validated.data.programId)
      .single();

    const { error } = await insforge.database
      .from("programs")
      .update({
        name: validated.data.name,
        manager_id: validated.data.managerId || null,
        status: validated.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.data.programId);

    if (error) {
      logger.error({ error, programId: validated.data.programId }, "Failed to update program");
      return { success: false, error: "Failed to update program" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "program.updated",
        "program",
        validated.data.programId,
        { name: validated.data.name, status: validated.data.status }
      )
    );

    if (currentProgram) {
      revalidatePath(`/portfolios/${currentProgram.portfolio_id}`);
    }
    revalidatePath(`/programs/${validated.data.programId}`);
    return { success: true };
  } catch (err) {
    logger.error(err, "Unexpected error in updateProgram Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteProgram(
  orgId: string,
  programId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = deleteProgramSchema.safeParse({ orgId, programId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can delete programs." };
    }

    const { data: currentProgram } = await insforge.database
      .from("programs")
      .select("portfolio_id")
      .eq("id", validated.data.programId)
      .single();

    const { error } = await insforge.database
      .from("programs")
      .delete()
      .eq("id", validated.data.programId);

    if (error) {
      logger.error({ error, programId: validated.data.programId }, "Failed to delete program");
      return { success: false, error: "Failed to delete program" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "program.deleted",
        "program",
        validated.data.programId
      )
    );

    if (currentProgram) {
      revalidatePath(`/portfolios/${currentProgram.portfolio_id}`);
    }
    return { success: true };
  } catch (err) {
    logger.error(err, "Unexpected error in deleteProgram Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getProgramDetails(
  orgId: string,
  programId: string
): Promise<{ success: boolean; data?: Program & ProgramRollupData & { portfolio_id: string; manager?: { full_name: string | null; email: string; avatar_url: string | null } | null }; error?: string }> {
  const validated = z.object({ orgId: orgIdSchema, programId: programIdSchema }).safeParse({ orgId, programId });
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

    const { data: program, error } = await insforge.database
      .from("programs")
      .select(`
        *,
        profiles:manager_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("id", validated.data.programId)
      .maybeSingle();

    if (error || !program) {
      return { success: false, error: "Program not found" };
    }

    const rollup = await getProgramMetrics(insforge, program.id);
    const managerProfile = Array.isArray(program.profiles) ? program.profiles[0] : program.profiles;

    return {
      success: true,
      data: {
        ...(program as Program),
        ...rollup,
        status: program.status as ProgramStatus,
        manager: managerProfile || null,
      },
    };
  } catch (err) {
    logger.error(err, "Unexpected error in getProgramDetails Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function linkProjectsToProgram(
  orgId: string,
  programId: string,
  projectIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const validated = linkProjectsSchema.safeParse({ orgId, programId, projectIds });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can link projects to programs." };
    }

    if (validated.data.projectIds.length > 0) {
      // 1. Enforce business rule: A project belongs to at most one program.
      // Delete any existing associations for these project IDs.
      const { error: deleteErr } = await insforge.database
        .from("program_projects")
        .delete()
        .in("project_id", validated.data.projectIds);

      if (deleteErr) {
        logger.error({ error: deleteErr, projectIds: validated.data.projectIds }, "Failed to clear prior project program links");
        return { success: false, error: "Failed to link projects" };
      }

      // 2. Insert new associations
      const inserts = validated.data.projectIds.map((pid) => ({
        program_id: validated.data.programId,
        project_id: pid,
      }));

      const { error: insertErr } = await insforge.database
        .from("program_projects")
        .insert(inserts);

      if (insertErr) {
        logger.error({ error: insertErr, inserts }, "Failed to link projects to program");
        return { success: false, error: "Failed to link projects" };
      }
    }

    revalidatePath(`/programs/${validated.data.programId}`);
    return { success: true };
  } catch (err) {
    logger.error(err, "Unexpected error in linkProjectsToProgram Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function unlinkProjectFromProgram(
  orgId: string,
  programId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = unlinkProjectSchema.safeParse({ orgId, programId, projectId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can unlink projects." };
    }

    const { error } = await insforge.database
      .from("program_projects")
      .delete()
      .eq("program_id", validated.data.programId)
      .eq("project_id", validated.data.projectId);

    if (error) {
      logger.error({ error, programId: validated.data.programId, projectId: validated.data.projectId }, "Failed to unlink project");
      return { success: false, error: "Failed to unlink project" };
    }

    revalidatePath(`/programs/${validated.data.programId}`);
    return { success: true };
  } catch (err) {
    logger.error(err, "Unexpected error in unlinkProjectFromProgram Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getUnassignedProjects(
  orgId: string
): Promise<{ success: boolean; data?: { id: string; name: string }[]; error?: string }> {
  const validated = orgIdSchema.safeParse(orgId);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const { data: allProjects, error: allProjErr } = await insforge.database
      .from("projects")
      .select("id, name")
      .eq("organization_id", validated.data);

    if (allProjErr) {
      logger.error({ error: allProjErr }, "Failed to fetch all projects");
      return { success: false, error: "Failed to fetch projects" };
    }

    const { data: linkedProjects, error: linkedProjErr } = await insforge.database
      .from("program_projects")
      .select("project_id");

    if (linkedProjErr) {
      logger.error({ error: linkedProjErr }, "Failed to fetch linked projects");
      return { success: false, error: "Failed to fetch projects" };
    }

    const linkedIds = new Set(linkedProjects?.map((lp) => lp.project_id) || []);
    const unassigned = allProjects?.filter((p) => !linkedIds.has(p.id)) || [];

    return { success: true, data: unassigned };
  } catch (err) {
    logger.error(err, "Unexpected error in getUnassignedProjects Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
