-- Add UPDATE policy for campaign_health_scores
CREATE POLICY "update_own_health_scores" ON public.campaign_health_scores FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_health_scores.workspace_id
      AND wm.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_health_scores.workspace_id
      AND wm.user_id = auth.uid()
    )
  );