-- 1. Extend Workflows for Category Folders and Active Versions
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS active_version_id UUID;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'));

-- 2. Create Workflow Versions Table (Immutable Versions)
CREATE TABLE IF NOT EXISTS public.workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    trigger TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for workflow versions
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view versions in their organization" ON public.workflow_versions;
CREATE POLICY "Users can view versions in their organization"
    ON public.workflow_versions FOR SELECT
    USING (is_org_member(organization_id, current_user_id()));

-- 3. Create Normalized Workflow Executions Table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.workflow_versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'QUEUED', 'COMPLETED', 'CANCELLED', 'FAILED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration INTEGER, -- duration in milliseconds
    trigger_event TEXT NOT NULL,
    triggered_by TEXT, -- Clerk User ID or "SYSTEM"
    payload_snapshot JSONB, -- Stored snapshot (cleaned by retention policy)
    has_payload_deleted BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for workflow executions
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view executions in their organization" ON public.workflow_executions;
CREATE POLICY "Users can view executions in their organization"
    ON public.workflow_executions FOR SELECT
    USING (is_org_member(organization_id, current_user_id()));

-- 4. Create Normalized Workflow Execution Steps Table (Queryable & Indexable Logs)
CREATE TABLE IF NOT EXISTS public.workflow_execution_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration INTEGER,
    error TEXT,
    retry_count INTEGER DEFAULT 0
);

-- RLS for steps
ALTER TABLE public.workflow_execution_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view execution steps" ON public.workflow_execution_steps;
CREATE POLICY "Users can view execution steps"
    ON public.workflow_execution_steps FOR SELECT
    USING (execution_id IN (
        SELECT id FROM public.workflow_executions WHERE is_org_member(organization_id, current_user_id())
    ));

-- 5. Create Granular Workflow Permissions Table
CREATE TABLE IF NOT EXISTS public.workflow_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL, -- OWNER, ADMIN, MEMBER or custom role names
    can_create BOOLEAN DEFAULT FALSE,
    can_publish BOOLEAN DEFAULT FALSE,
    can_disable BOOLEAN DEFAULT FALSE,
    can_retry BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_execute BOOLEAN DEFAULT FALSE,
    can_view_logs BOOLEAN DEFAULT FALSE,
    UNIQUE(organization_id, role_name)
);

-- RLS for permissions
ALTER TABLE public.workflow_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view permissions in their organization" ON public.workflow_permissions;
CREATE POLICY "Users can view permissions in their organization"
    ON public.workflow_permissions FOR SELECT
    USING (is_org_member(organization_id, current_user_id()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wf_versions_wf ON public.workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_org_version ON public.workflow_executions(organization_id, version_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_steps_exec ON public.workflow_execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_steps_status ON public.workflow_execution_steps(status);
