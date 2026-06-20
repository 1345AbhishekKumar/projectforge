import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid unique identifier");

const ORG_ID = "00000000-0000-0000-0000-000000000000";
const PROJECT_ID = "9e8d7c6b-5a4f-4b0e-9c8d-7e6f5a4b3c2d";
const TEMPLATE_ID = "e2d1c0b9-a8f7-4e6e-bd5c-4b3a2f1e0d9c";
const TASK_LAUNCH_ID = "d4e5f6a7-b8c9-4ad0-be0f-1f2a3b4c5d6e";

console.log("ORG_ID:", uuidSchema.safeParse(ORG_ID).success);
console.log("PROJECT_ID:", uuidSchema.safeParse(PROJECT_ID).success);
console.log("TEMPLATE_ID:", uuidSchema.safeParse(TEMPLATE_ID).success);
console.log("TASK_LAUNCH_ID:", uuidSchema.safeParse(TASK_LAUNCH_ID).success);
