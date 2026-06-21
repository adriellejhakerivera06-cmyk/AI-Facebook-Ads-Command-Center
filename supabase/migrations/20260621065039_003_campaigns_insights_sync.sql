-- Campaigns table
CREATE TABLE public.meta_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_connection_id UUID NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  
  -- Campaign info from Meta
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT,
  effective_status TEXT,
  buying_type TEXT,
  budget_remaining DECIMAL(15,2),
  daily_budget DECIMAL(15,2),
  lifetime_budget DECIMAL(15,2),
  start_time TIMESTAMPTZ,
  stop_time TIMESTAMPTZ,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  data_hash TEXT, -- For change detection
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ad_account_id, campaign_id)
);

-- Ad Sets table
CREATE TABLE public.meta_ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_connection_id UUID NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  
  -- Ad Set info from Meta
  adset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_id_meta TEXT, -- The Meta campaign ID (not our FK)
  status TEXT,
  effective_status TEXT,
  optimization_goal TEXT,
  billing_event TEXT,
  bid_strategy TEXT,
  daily_budget DECIMAL(15,2),
  lifetime_budget DECIMAL(15,2),
  targeting JSONB,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  data_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ad_account_id, adset_id)
);

-- Ads table
CREATE TABLE public.meta_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_connection_id UUID NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  ad_set_id UUID NOT NULL REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  
  -- Ad info from Meta
  ad_id TEXT NOT NULL,
  name TEXT NOT NULL,
  adset_id_meta TEXT,
  campaign_id_meta TEXT,
  status TEXT,
  effective_status TEXT,
  creative JSONB,
  display_format TEXT,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  data_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ad_account_id, ad_id)
);

-- Insights table (daily metrics)
CREATE TABLE public.meta_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_connection_id UUID NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  
  -- Entity reference (polymorphic - can be account, campaign, ad set, or ad level)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account', 'campaign', 'adset', 'ad')),
  entity_id UUID,
  entity_id_meta TEXT NOT NULL, -- The Meta ID
  ad_account_id UUID REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  
  -- Date
  date DATE NOT NULL,
  
  -- Metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  unique_clicks BIGINT DEFAULT 0,
  spend DECIMAL(15,2) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  ctr DECIMAL(10,4) DEFAULT 0,
  
  -- Conversions
  actions JSONB,
  conversions BIGINT DEFAULT 0,
  conversion_value DECIMAL(15,2) DEFAULT 0,
  cost_per_conversion DECIMAL(10,4) DEFAULT 0,
  roas DECIMAL(10,4) DEFAULT 0,
  
  -- Purchase data
  purchases BIGINT DEFAULT 0,
  purchase_value DECIMAL(15,2) DEFAULT 0,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one insight record per entity per date
  UNIQUE(entity_type, entity_id_meta, date)
);

-- Sync logs table
CREATE TABLE public.meta_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_connection_id UUID NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  ad_account_id UUID REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  
  -- Sync type
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual', 'scheduled')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('all', 'business_managers', 'ad_accounts', 'campaigns', 'adsets', 'ads', 'insights')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  
  -- Progress
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Rate limiting
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync state table (tracks last successful sync per entity type)
CREATE TABLE public.meta_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_connection_id UUID NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  ad_account_id UUID REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  
  entity_type TEXT NOT NULL CHECK (entity_type IN ('business_managers', 'ad_accounts', 'campaigns', 'adsets', 'ads', 'insights')),
  
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  last_sync_log_id UUID REFERENCES public.meta_sync_logs(id),
  cursor TEXT, -- For pagination-based syncs
  error_count INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(meta_connection_id, ad_account_id, entity_type)
);

-- Create indexes
CREATE INDEX idx_meta_campaigns_connection ON public.meta_campaigns(meta_connection_id);
CREATE INDEX idx_meta_campaigns_account ON public.meta_campaigns(ad_account_id);
CREATE INDEX idx_meta_campaigns_status ON public.meta_campaigns(status);
CREATE INDEX idx_meta_ad_sets_connection ON public.meta_ad_sets(meta_connection_id);
CREATE INDEX idx_meta_ad_sets_account ON public.meta_ad_sets(ad_account_id);
CREATE INDEX idx_meta_ad_sets_campaign ON public.meta_ad_sets(campaign_id);
CREATE INDEX idx_meta_ads_connection ON public.meta_ads(meta_connection_id);
CREATE INDEX idx_meta_ads_account ON public.meta_ads(ad_account_id);
CREATE INDEX idx_meta_ads_campaign ON public.meta_ads(campaign_id);
CREATE INDEX idx_meta_ads_adset ON public.meta_ads(ad_set_id);
CREATE INDEX idx_meta_insights_connection ON public.meta_insights(meta_connection_id);
CREATE INDEX idx_meta_insights_entity ON public.meta_insights(entity_type, entity_id_meta);
CREATE INDEX idx_meta_insights_date ON public.meta_insights(date);
CREATE INDEX idx_meta_sync_logs_connection ON public.meta_sync_logs(meta_connection_id);
CREATE INDEX idx_meta_sync_logs_status ON public.meta_sync_logs(status);
CREATE INDEX idx_meta_sync_state_connection ON public.meta_sync_state(meta_connection_id);

-- Enable RLS
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as meta_connections)
CREATE POLICY "select_campaigns_as_member" ON public.meta_campaigns FOR SELECT
  TO authenticated USING (
    meta_connection_id IN (
      SELECT id FROM public.meta_connections 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "select_adsets_as_member" ON public.meta_ad_sets FOR SELECT
  TO authenticated USING (
    meta_connection_id IN (
      SELECT id FROM public.meta_connections 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "select_ads_as_member" ON public.meta_ads FOR SELECT
  TO authenticated USING (
    meta_connection_id IN (
      SELECT id FROM public.meta_connections 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "select_insights_as_member" ON public.meta_insights FOR SELECT
  TO authenticated USING (
    meta_connection_id IN (
      SELECT id FROM public.meta_connections 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "select_synclogs_as_member" ON public.meta_sync_logs FOR SELECT
  TO authenticated USING (
    meta_connection_id IN (
      SELECT id FROM public.meta_connections 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_meta_campaigns_updated_at
  BEFORE UPDATE ON public.meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_meta_ad_sets_updated_at
  BEFORE UPDATE ON public.meta_ad_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_meta_ads_updated_at
  BEFORE UPDATE ON public.meta_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create composite index for insights queries (common analytics queries)
CREATE INDEX idx_meta_insights_composite ON public.meta_insights(entity_type, entity_id_meta, date DESC);