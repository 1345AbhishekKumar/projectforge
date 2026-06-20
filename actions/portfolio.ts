"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Portfolio, PortfolioStatus } from "@/types";
import { orgIdSchema, uuidSchema } from "@/lib/utils";
import { verifyMembership, verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { getPortfolioMetrics, type PortfolioRollupData } from "@/lib/portfolio-utils";

const portfolioIdSchema = uuidSchema;

const portfolioInputSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  description: z.string().max(250).nullable().optional(),
});

const createPortfolioSchema = portfolioInputSchema.extend({
  orgId: orgIdSchema,
});

const updatePortfolioSchema = portfolioInputSchema.extend({
  portfolioId: portfolioIdSchema,
  orgId: orgIdSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const deletePortfolioSchema = z.object({
  portfolioId: portfolioIdSchema,
  orgId: orgIdSchema,
});

export async function createPortfolio(
  orgId: string,
  name: string,
  description: string | null
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  const validated = createPortfolioSchema.safeParse({ orgId, name, description });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can create portfolios." };
    }

    const { data: portfolio, error } = await insforge.database
      .from("portfolios")
      .insert([
        {
          organization_id: validated.data.orgId,
          name: validated.data.name,
          description: validated.data.description || null,
          owner_id: userId,
          status: "ACTIVE",
        },
      ])
      .select("id")
      .single();

    if (error || !portfolio) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to create portfolio");
      return { success: false, error: "Failed to create portfolio" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "portfolio.created",
        "portfolio",
        portfolio.id,
        { name: validated.data.name }
      )
    );

    revalidatePath("/portfolios");
    return { success: true, data: { id: portfolio.id } };
  } catch (err) {
    logger.error(err, "Unexpected error in createPortfolio Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updatePortfolio(
  orgId: string,
  portfolioId: string,
  name: string,
  description: string | null,
  status: PortfolioStatus
): Promise<{ success: boolean; error?: string }> {
  const validated = updatePortfolioSchema.safeParse({ orgId, portfolioId, name, description, status });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can update portfolios." };
    }

    const { error } = await insforge.database
      .from("portfolios")
      .update({
        name: validated.data.name,
        description: validated.data.description || null,
        status: validated.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.data.portfolioId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, portfolioId: validated.data.portfolioId }, "Failed to update portfolio");
      return { success: false, error: "Failed to update portfolio" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "portfolio.updated",
        "portfolio",
        validated.data.portfolioId,
        { name: validated.data.name, status: validated.data.status }
      )
    );

    revalidatePath("/portfolios");
    revalidatePath(`/portfolios/${validated.data.portfolioId}`);
    return { success: true };
  } catch (err) {
    logger.error(err, "Unexpected error in updatePortfolio Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deletePortfolio(
  orgId: string,
  portfolioId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = deletePortfolioSchema.safeParse({ orgId, portfolioId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can delete portfolios." };
    }

    const { error } = await insforge.database
      .from("portfolios")
      .delete()
      .eq("id", validated.data.portfolioId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, portfolioId: validated.data.portfolioId }, "Failed to delete portfolio");
      return { success: false, error: "Failed to delete portfolio" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "portfolio.deleted",
        "portfolio",
        validated.data.portfolioId
      )
    );

    revalidatePath("/portfolios");
    return { success: true };
  } catch (err) {
    logger.error(err, "Unexpected error in deletePortfolio Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getPortfolios(
  orgId: string
): Promise<{ success: boolean; data?: (Portfolio & PortfolioRollupData)[]; error?: string }> {
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

    const { data: portfolios, error } = await insforge.database
      .from("portfolios")
      .select("*")
      .eq("organization_id", validated.data)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error({ error, orgId: validated.data }, "Failed to fetch portfolios");
      return { success: false, error: "Failed to fetch portfolios" };
    }

    const result: (Portfolio & PortfolioRollupData)[] = [];
    for (const portfolio of portfolios) {
      const rollup = await getPortfolioMetrics(insforge, portfolio.id);
      result.push({
        ...(portfolio as Portfolio),
        status: portfolio.status as PortfolioStatus,
        ...rollup,
      });
    }

    return { success: true, data: result };
  } catch (err) {
    logger.error(err, "Unexpected error in getPortfolios Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getPortfolioDetails(
  orgId: string,
  portfolioId: string
): Promise<{ success: boolean; data?: Portfolio & PortfolioRollupData; error?: string }> {
  const validated = z.object({ orgId: orgIdSchema, portfolioId: portfolioIdSchema }).safeParse({ orgId, portfolioId });
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

    const { data: portfolio, error } = await insforge.database
      .from("portfolios")
      .select("*")
      .eq("id", validated.data.portfolioId)
      .eq("organization_id", validated.data.orgId)
      .maybeSingle();

    if (error || !portfolio) {
      return { success: false, error: "Portfolio not found" };
    }

    const rollup = await getPortfolioMetrics(insforge, portfolio.id);

    return {
      success: true,
      data: {
        ...(portfolio as Portfolio),
        status: portfolio.status as PortfolioStatus,
        ...rollup,
      },
    };
  } catch (err) {
    logger.error(err, "Unexpected error in getPortfolioDetails Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
