-- Saved views for dashboard customization
CREATE TABLE public.saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- View configuration
  name TEXT NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'campaigns' CHECK (view_type IN ('campaigns', 'adsets', 'ads', 'analytics')),
  is_default BOOLEAN DEFAULT false,
  
  -- Columns configuration
  columns JSONB DEFAULT '["name", "status", "budget", "spent", "impressions", "clicks", "ctr", "cpc", "conversions"]',
  
  -- Filters configuration
  filters JSONB DEFAULT '{}',
  
  -- Sorting configuration  
  sort_by TEXT DEFAULT 'name',
  sort_order TEXT DEFAULT 'asc' CHECK (sort_order IN ('asc', 'desc')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, user_id, name)
);

-- Create index
CREATE INDEX idx_saved_views_workspace ON public.saved_views(workspace_id);
CREATE INDEX idx_saved_views_user ON public.saved_views(user_id);

-- Enable RLS
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "select_own_saved_views" ON public.saved_views FOR SELECT
  TO authenticated USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "insert_own_saved_view" ON public.saved_views FOR INSERT
  TO authenticated WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "update_own_saved_view" ON public.saved_views FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "delete_own_saved_view" ON public.saved_views FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();