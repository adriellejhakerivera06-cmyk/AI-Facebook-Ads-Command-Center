'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useAdAccountFilter } from '@/providers/AdAccountFilterProvider'
import { Megaphone, RefreshCw, Search, ListFilter as Filter, MoveHorizontal as MoreHorizontal, Play, Pause, ChartBar as BarChart3, DollarSign, Eye, MousePointerClick, TrendingUp, TrendingDown, Clock, Calendar, ChevronDown, Loader as Loader2 } from 'lucide-react'

type Campaign = {
  id: string
  campaign_id: string
  name: string
  objective: string | null
  status: string | null
  effective_status: string | null
  budget_remaining: number
  daily_budget: number
  lifetime_budget: number
  start_time: string | null
  stop_time: string | null
  last_synced_at: string | null
  ad_account: {
    id: string
    name: string
    currency: string
  }
}

type CampaignInsight = {
  impressions: number
  clicks: number
  spend: number
  reach: number
  cpm: number
  cpc: number
  ctr: number
  conversions: number
}

export default function CampaignsPage() {
  const { currentWorkspace } = useWorkspace()
  const { selectedAdAccountId } = useAdAccountFilter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  useEffect(() => {
    fetchCampaigns()
  }, [currentWorkspace, selectedAdAccountId])

  const fetchCampaigns = async () => {
    if (!currentWorkspace) return

    setLoading(true)
    try {
      // First get connections
      const connResponse = await fetch(`/api/meta/status?workspace_id=${currentWorkspace.id}`)
      const connections = await connResponse.json()

      if (!connResponse.ok) {
        throw new Error(connections.error || 'Failed to fetch connections')
      }

      // Get campaigns for each connection
      const allCampaigns: Campaign[] = []

      for (const conn of connections || []) {
        // Build URL with optional ad account filter
        let url = `/api/meta/campaigns?connection_id=${conn.id}`
        if (selectedAdAccountId) {
          url += `&ad_account_id=${selectedAdAccountId}`
        }
        
        const { data, error } = await fetch(url).then(r => r.json())

        if (data) {
          allCampaigns.push(...data)
        }
      }

      setCampaigns(allCampaigns)
    } catch (e: any) {
      setError(e.message || 'Failed to fetch campaigns')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string | null, effectiveStatus: string | null) => {
    const effective = effectiveStatus || status
    switch (effective?.toUpperCase()) {
      case 'ACTIVE':
        return 'text-green-400 bg-green-400/10'
      case 'PAUSED':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'COMPLETED':
        return 'text-blue-400 bg-blue-400/10'
      case 'ARCHIVED':
        return 'text-slate-400 bg-slate-400/10'
      case 'IN_PROCESS':
        return 'text-blue-400 bg-blue-400/10'
      default:
        return 'text-slate-400 bg-slate-400/10'
    }
  }

  const formatBudget = (amount: number, currency: string = 'USD') => {
    if (!amount || amount === 0) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 100)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredCampaigns = campaigns
    .filter(c => {
      if (statusFilter !== 'all') {
        const effective = c.effective_status || c.status
        if (effective?.toUpperCase() !== statusFilter.toUpperCase()) return false
      }
      if (searchQuery) {
        return c.name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-slate-400 mt-1">
            {campaigns.length} campaigns across all ad accounts
          </p>
        </div>
        <button
          onClick={fetchCampaigns}
          disabled={loading}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
          <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No campaigns found</h2>
          <p className="text-slate-400 mb-6">
            Connect a Meta account and sync your campaigns to see them here.
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                  <th className="px-6 py-4 font-medium">Campaign</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Budget</th>
                  <th className="px-6 py-4 font-medium">Start</th>
                  <th className="px-6 py-4 font-medium">Synced</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">
                          <Megaphone className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{campaign.name}</p>
                          <p className="text-xs text-slate-500">{campaign.ad_account?.name || 'Unknown Account'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${getStatusColor(campaign.status, campaign.effective_status)}`}>
                        {campaign.effective_status || campaign.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">
                        {formatBudget(campaign.daily_budget || campaign.lifetime_budget, campaign.ad_account?.currency)}
                        <span className="text-xs text-slate-500 ml-1">
                          {campaign.daily_budget ? '/day' : 'total'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDate(campaign.start_time)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {campaign.last_synced_at
                        ? new Date(campaign.last_synced_at).toLocaleString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCampaigns.length === 0 && campaigns.length > 0 && (
            <div className="text-center py-8 text-slate-500">
              No campaigns match your filters
            </div>
          )}
        </div>
      )}
    </div>
  )
}
