-- Campaign Alerts table
CREATE TABLE IF NOT EXISTS campaign_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  alert_type TEXT NOT NULL CHECK (alert_type IN ('roas_drop', 'cpa_spike', 'high_frequency', 'creative_fatigue', 'spend_anomaly', 'pixel_issue', 'learning_limited')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  metric_name TEXT,
  metric_value DECIMAL(15,4),
  threshold_value DECIMAL(15,4),
  previous_value DECIMAL(15,4),

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert deduplication table
CREATE TABLE IF NOT EXISTS alert_dedup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key TEXT NOT NULL UNIQUE,
  alert_id UUID REFERENCES campaign_alerts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_alerts_campaign ON campaign_alerts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_alerts_workspace ON campaign_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_alerts_type ON campaign_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_campaign_alerts_status ON campaign_alerts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_alerts_severity ON campaign_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_campaign_alerts_created ON campaign_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_dedup_key ON alert_dedup(alert_key);

-- Enable RLS
ALTER TABLE campaign_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_dedup ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_alerts
CREATE POLICY "select_own_alerts" ON campaign_alerts FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_alerts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_alerts" ON campaign_alerts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_alerts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_alerts" ON campaign_alerts FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_alerts.workspace_id
      AND wm.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_alerts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "delete_own_alerts" ON campaign_alerts FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_alerts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- RLS Policies for alert_dedup
CREATE POLICY "select_own_dedup" ON alert_dedup FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_own_dedup" ON alert_dedup FOR INSERT
  TO authenticated WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_campaign_alerts_updated_at
  BEFORE UPDATE ON campaign_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();