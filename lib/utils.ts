import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 25;

export const uuidSchema = z.string().uuid("Invalid unique identifier");
export const orgIdSchema = uuidSchema;
export const projectIdSchema = uuidSchema;
export const taskIdSchema = uuidSchema;
export const sprintIdSchema = uuidSchema;
export const labelIdSchema = uuidSchema;
export const membershipIdSchema = uuidSchema;
export const attachmentIdSchema = uuidSchema;
export const viewIdSchema = uuidSchema;
export const notificationIdSchema = uuidSchema;
