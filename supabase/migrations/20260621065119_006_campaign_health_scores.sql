-- Campaign Health Scores table for tracking historical scores
CREATE TABLE IF NOT EXISTS campaign_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES meta_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Overall score and grade
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT NOT NULL, -- 'A+', 'A', 'B', 'C', 'D', 'F'
  tier TEXT NOT NULL, -- 'Excellent', 'Good', 'Average', 'Poor', 'Critical'
  
  -- Individual factor scores (0-100 each)
  roas_score INTEGER NOT NULL,
  cpa_score INTEGER NOT NULL,
  ctr_score INTEGER NOT NULL,
  frequency_score INTEGER NOT NULL,
  conversion_rate_score INTEGER NOT NULL,
  
  -- Raw metric values at time of scoring
  roas_value DECIMAL(10,4),
  cpa_value DECIMAL(12,2),
  ctr_value DECIMAL(10,4),
  frequency_value DECIMAL(10,4),
  conversion_rate_value DECIMAL(10,4),
  spend_value DECIMAL(12,2),
  impressions_value BIGINT,
  clicks_value BIGINT,
  conversions_value BIGINT,
  purchase_value DECIMAL(12,2),
  
  -- Additional context
  campaign_status TEXT,
  effective_status TEXT,
  learning_status TEXT,
  
  -- Insights window for this score
  date_range_start DATE,
  date_range_end DATE,
  insights_count INTEGER,
  
  -- Timestamps
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_campaign_health_scores_campaign ON campaign_health_scores(campaign_id);
CREATE INDEX idx_campaign_health_scores_workspace ON campaign_health_scores(workspace_id);
CREATE INDEX idx_campaign_health_scores_computed ON campaign_health_scores(computed_at DESC);

-- Enable RLS
ALTER TABLE campaign_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "select_own_health_scores" ON campaign_health_scores FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_health_scores.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_health_scores" ON campaign_health_scores FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_health_scores.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "delete_own_health_scores" ON campaign_health_scores FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_health_scores.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Comment documenting the scoring formula
COMMENT ON TABLE campaign_health_scores IS 'Campaign Health Score Formula:
Weighted scoring system (0-100 scale):
- ROAS Score: 30% weight - measures return efficiency
  - >= 4.0 = 100, >= 2.0 = 75, >= 1.0 = 50, >= 0.5 = 25, < 0.5 = based on linear scale
- CPA Score: 25% weight - measures cost efficiency
  - Based on inverse relationship with industry CPA benchmarks
- CTR Score: 20% weight - measures engagement quality
  - >= 2.0% = 100, >= 1.0% = 75, >= 0.5% = 50, >= 0.25% = 25, < 0.25% = based on linear scale
- Frequency Score: 15% weight - measures audience saturation
  - Optimal 1.5-3.0 = 100, degraded score outside optimal range
- Conversion Rate Score: 10% weight - measures funnel efficiency
  - Based on industry conversion rate benchmarks

Grade Scale:
- A+ (90-100): Excellent
- A (80-89): Very Good
- B (70-79): Good
- C (60-69): Average
- D (50-59): Poor
- F (0-49): Critical';