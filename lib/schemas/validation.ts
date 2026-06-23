import { z } from "zod";

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(50, "Project name must be at most 50 characters"),
  description: z
    .string()
    .trim()
    .max(250, "Description must be at most 250 characters")
    .nullable()
    .optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
  departmentId: z.string().uuid().nullable().optional(),
  custom_statuses: z
    .array(z.string().trim().min(1, "Status cannot be empty").max(30))
    .min(2, "Must specify at least 2 statuses")
    .max(10, "Cannot specify more than 10 statuses")
    .refine((items) => new Set(items).size === items.length, {
      message: "Statuses must be unique",
    })
    .nullable()
    .optional(),
  templateId: z.string().uuid().nullable().optional(),
});

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Task title must be at least 3 characters")
    .max(100, "Task title must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
  status: z.string().min(1, "Status is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
});

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(50, "Full name cannot exceed 50 characters"),
  avatarUrl: z
    .string()
    .trim()
    .url("Please enter a valid URL (e.g., https://example.com/avatar.jpg)")
    .or(z.literal(""))
    .nullable()
    .optional(),
  locale: z.enum(["en", "es", "fr", "de", "ja"]).default("en"),
});

export const riskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Risk title is required")
    .max(200, "Title is too long"),
  probability: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  mitigationPlan: z
    .string()
    .trim()
    .max(1000, "Mitigation plan is too long")
    .nullable()
    .optional(),
});
