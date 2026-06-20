import { spawn } from "child_process";

const sqlQuery = `
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('TASK', 'PROJECT')),
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('TEXT', 'NUMBER', 'SELECT', 'DATE')),
  options TEXT[], 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cf_org_entity_name UNIQUE (organization_id, entity_type, name)
);

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL, 
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cfv_field_entity UNIQUE (custom_field_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_org ON public.custom_fields(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON public.custom_field_values(custom_field_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON public.custom_field_values(entity_id);

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- drop existing policies if any
DROP POLICY IF EXISTS custom_fields_select ON public.custom_fields;
DROP POLICY IF EXISTS custom_fields_insert ON public.custom_fields;
DROP POLICY IF EXISTS custom_fields_update ON public.custom_fields;
DROP POLICY IF EXISTS custom_fields_delete ON public.custom_fields;

DROP POLICY IF EXISTS custom_field_values_select ON public.custom_field_values;
DROP POLICY IF EXISTS custom_field_values_insert ON public.custom_field_values;
DROP POLICY IF EXISTS custom_field_values_update ON public.custom_field_values;
DROP POLICY IF EXISTS custom_field_values_delete ON public.custom_field_values;

-- custom_fields policies
CREATE POLICY custom_fields_select ON public.custom_fields
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id, current_user_id()));

CREATE POLICY custom_fields_insert ON public.custom_fields
  FOR INSERT TO authenticated
  WITH CHECK (is_org_admin_or_owner(organization_id, current_user_id()));

CREATE POLICY custom_fields_update ON public.custom_fields
  FOR UPDATE TO authenticated
  USING (is_org_admin_or_owner(organization_id, current_user_id()))
  WITH CHECK (is_org_admin_or_owner(organization_id, current_user_id()));

CREATE POLICY custom_fields_delete ON public.custom_fields
  FOR DELETE TO authenticated
  USING (is_org_admin_or_owner(organization_id, current_user_id()));

-- custom_field_values policies
CREATE POLICY custom_field_values_select ON public.custom_field_values
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_fields cf
    WHERE cf.id = custom_field_id
    AND is_org_member(cf.organization_id, current_user_id())
  ));

CREATE POLICY custom_field_values_insert ON public.custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.custom_fields cf
    WHERE cf.id = custom_field_id
    AND is_org_member(cf.organization_id, current_user_id())
  ));

CREATE POLICY custom_field_values_update ON public.custom_field_values
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_fields cf
    WHERE cf.id = custom_field_id
    AND is_org_member(cf.organization_id, current_user_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.custom_fields cf
    WHERE cf.id = custom_field_id
    AND is_org_member(cf.organization_id, current_user_id())
  ));

CREATE POLICY custom_field_values_delete ON public.custom_field_values
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_fields cf
    WHERE cf.id = custom_field_id
    AND is_org_member(cf.organization_id, current_user_id())
  ));
`;

async function run() {
  const apiKey = "ik_5498758fbfb2ee2826bf3e98dcf07f83";
  const apiBaseUrl = "https://4eyc68ep.us-east.insforge.app";

  console.log("Starting MCP process...");
  const child = spawn("npx", [
    "-y",
    "@insforge/mcp@latest",
    "--api_key",
    apiKey,
    "--api_base_url",
    apiBaseUrl,
  ], { shell: true });

  let output = "";
  child.stdout.on("data", (data) => {
    output += data.toString();
  });

  child.stderr.on("data", (data) => {
    console.error("MCP Stderr:", data.toString());
  });

  // Wait a bit for initialization, then send the tool call
  await new Promise((r) => setTimeout(r, 2000));

  const request = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "run-raw-sql",
      arguments: {
        query: sqlQuery,
      },
    },
    id: 1,
  };

  console.log("Sending run-raw-sql request...");
  child.stdin.write(JSON.stringify(request) + "\n");

  // Wait for response and print it
  await new Promise((r) => setTimeout(r, 4000));
  console.log("Response output:");
  console.log(output);

  child.kill();
}

run();
