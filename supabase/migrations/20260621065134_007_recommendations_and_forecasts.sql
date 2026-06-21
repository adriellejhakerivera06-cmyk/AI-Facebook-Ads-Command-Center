-- Campaign Recommendations table
CREATE TABLE IF NOT EXISTS campaign_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL CHECK (action_type IN ('increase_budget', 'decrease_budget', 'pause', 'duplicate', 'refresh_creatives', 'expand_audience')),
  confidence_score DECIMAL(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT NOT NULL,
  current_metrics JSONB NOT NULL DEFAULT '{}',
  suggested_value JSONB,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Forecasts table
CREATE TABLE IF NOT EXISTS campaign_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('revenue', 'spend', 'roas', 'cpa', 'purchases')),
  forecast_period_days INTEGER NOT NULL CHECK (forecast_period_days > 0),
  predicted_value DECIMAL(15,4) NOT NULL,
  confidence_lower DECIMAL(15,4),
  confidence_upper DECIMAL(15,4),
  confidence_level DECIMAL(4,3) NOT NULL DEFAULT 0.95 CHECK (confidence_level > 0 AND confidence_level <= 1),
  historical_data_points INTEGER NOT NULL DEFAULT 0,
  model_version TEXT NOT NULL DEFAULT 'v1.0',

  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_recommendations_campaign ON campaign_recommendations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recommendations_workspace ON campaign_recommendations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recommendations_status ON campaign_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recommendations_created ON campaign_recommendations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_forecasts_campaign ON campaign_forecasts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_forecasts_workspace ON campaign_forecasts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_forecasts_type ON campaign_forecasts(forecast_type);
CREATE INDEX IF NOT EXISTS idx_campaign_forecasts_generated ON campaign_forecasts(generated_at DESC);

-- Enable RLS
ALTER TABLE campaign_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_recommendations
CREATE POLICY "select_own_recommendations" ON campaign_recommendations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_recommendations.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_recommendations" ON campaign_recommendations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_recommendations.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_recommendations" ON campaign_recommendations FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_recommendations.workspace_id
      AND wm.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_recommendations.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "delete_own_recommendations" ON campaign_recommendations FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_recommendations.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- RLS Policies for campaign_forecasts
CREATE POLICY "select_own_forecasts" ON campaign_forecasts FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_forecasts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_forecasts" ON campaign_forecasts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_forecasts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_forecasts" ON campaign_forecasts FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_forecasts.workspace_id
      AND wm.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_forecasts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "delete_own_forecasts" ON campaign_forecasts FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_forecasts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );