'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { ChevronRight, ChevronDown, Search, ListFilter as Filter, ArrowUpDown, Columns3, Save, Loader as Loader2, RefreshCw, Settings2, Megaphone, Layers, FileText, DollarSign, Eye, MousePointerClick, Target, TrendingUp, ChartBar as BarChart3, Settings, X, Check } from 'lucide-react'

type Campaign = any
type AdSet = any
type Ad = any
type Insight = any

type SavedView = {
  id: string
  name: string
  view_type: string
  columns: string[]
  filters: Record<string, any>
  sort_by: string
  sort_order: string
  is_default: boolean
}

const AVAILABLE_COLUMNS = [
  { id: 'name', label: 'Name', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'budget', label: 'Budget', default: true },
  { id: 'spent', label: 'Spent', default: true },
  { id: 'impressions', label: 'Impressions', default: true },
  { id: 'clicks', label: 'Clicks', default: true },
  { id: 'ctr', label: 'CTR', default: true },
  { id: 'cpc', label: 'CPC', default: true },
  { id: 'cpm', label: 'CPM', default: false },
  { id: 'conversions', label: 'Conv.', default: true },
  { id: 'cost_per_conversion', label: 'Cost/Conv', default: false },
  { id: 'roas', label: 'ROAS', default: false },
  { id: 'reach', label: 'Reach', default: false },
  { id: 'frequency', label: 'Freq.', default: false },
  { id: 'account', label: 'Account', default: false },
  { id: 'last_synced', label: 'Synced', default: false },
]

export default function AnalyticsPage() {
  const { currentWorkspace } = useWorkspace()

  // Data state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adsets, setAdsets] = useState<Record<string, AdSet[]>>({})
  const [ads, setAds] = useState<Record<string, Ad[]>>({})
  const [insights, setInsights] = useState<Record<string, Insight>>({})

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set())

  // Filter/sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Column customization
  const [columns, setColumns] = useState<string[]>(() =>
    AVAILABLE_COLUMNS.filter(c => c.default).map(c => c.id)
  )
  const [showColumnPicker, setShowColumnPicker] = useState(false)

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [activeView, setActiveView] = useState<SavedView | null>(null)
  const [showSaveViewModal, setShowSaveViewModal] = useState(false)
  const [newViewName, setNewViewName] = useState('')

  // Load saved views and initial data
  useEffect(() => {
    if (currentWorkspace) {
      loadSavedViews()
      loadData()
    }
  }, [currentWorkspace])

  const loadSavedViews = async () => {
    if (!currentWorkspace) return
    try {
      const response = await fetch(`/api/views?workspace_id=${currentWorkspace.id}&view_type=campaigns`)
      const views = await response.json()
      setSavedViews(views || [])

      // Auto-load default view
      const defaultView = views?.find((v: SavedView) => v.is_default)
      if (defaultView) {
        applyView(defaultView)
      }
    } catch (e) {
      console.error('Failed to load saved views:', e)
    }
  }

  const loadData = async () => {
    if (!currentWorkspace) return

    setLoading(true)
    setError(null)

    try {
      // Fetch connections first
      const connResponse = await fetch(`/api/meta/status?workspace_id=${currentWorkspace.id}`)
      const connections = await connResponse.json()

      if (!connResponse.ok) {
        throw new Error(connections.error || 'Failed to fetch connections')
      }

      // Fetch campaigns for each connection
      const allCampaigns: Campaign[] = []
      for (const conn of connections || []) {
        const { data } = await fetch(`/api/meta/campaigns?connection_id=${conn.id}`).then(r => r.json())
        if (data) allCampaigns.push(...data)
      }
      setCampaigns(allCampaigns)

      // Fetch insights for all campaigns
      for (const conn of connections || []) {
        const { insights: campaignInsights } = await fetch(
          `/api/meta/insights?connection_id=${conn.id}&entity_type=campaign`
        ).then(r => r.json())

        const insightMap: Record<string, Insight> = {}
        campaignInsights?.forEach((i: Insight) => {
          insightMap[i.entity_id_meta] = i
        })
        setInsights(prev => ({ ...prev, ...insightMap }))
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadAdsetsForCampaign = async (campaignId: string, campaignMetaId: string) => {
    try {
      const { data } = await fetch(`/api/meta/adsets?campaign_id=${campaignId}`).then(r => r.json())
      setAdsets(prev => ({ ...prev, [campaignMetaId]: data || [] }))

      // Load insights for adsets
      const campaign = campaigns.find(c => c.campaign_id === campaignMetaId)
      if (campaign) {
        const { insights: adsetInsights } = await fetch(
          `/api/meta/insights?connection_id=${campaign.meta_connection_id}&entity_type=adset`
        ).then(r => r.json())

        adsetInsights?.forEach((i: Insight) => {
          setInsights(prev => ({ ...prev, [i.entity_id_meta]: i }))
        })
      }
    } catch (e) {
      console.error('Failed to load adsets:', e)
    }
  }

  const loadAdsForAdset = async (adsetId: string, adsetMetaId: string, connectionId: string) => {
    try {
      const { data } = await fetch(`/api/meta/ads?adset_id=${adsetId}`).then(r => r.json())
      setAds(prev => ({ ...prev, [adsetMetaId]: data || [] }))

      // Load insights for ads
      const { insights: adInsights } = await fetch(
        `/api/meta/insights?connection_id=${connectionId}&entity_type=ad`
      ).then(r => r.json())

      adInsights?.forEach((i: Insight) => {
        setInsights(prev => ({ ...prev, [i.entity_id_meta]: i }))
      })
    } catch (e) {
      console.error('Failed to load ads:', e)
    }
  }

  const toggleCampaign = async (campaign: Campaign) => {
    const campaignId = campaign.campaign_id
    const newExpanded = new Set(expandedCampaigns)

    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId)
    } else {
      newExpanded.add(campaignId)
      if (!adsets[campaignId]) {
        await loadAdsetsForCampaign(campaign.id, campaignId)
      }
    }

    setExpandedCampaigns(newExpanded)
  }

  const toggleAdset = async (adset: AdSet, connectionId: string) => {
    const adsetId = adset.adset_id
    const newExpanded = new Set(expandedAdsets)

    if (newExpanded.has(adsetId)) {
      newExpanded.delete(adsetId)
    } else {
      newExpanded.add(adsetId)
      if (!ads[adsetId]) {
        await loadAdsForAdset(adset.id, adsetId, connectionId)
      }
    }

    setExpandedAdsets(newExpanded)
  }

  const applyView = (view: SavedView) => {
    setColumns(view.columns)
    setSortBy(view.sort_by)
    setSortOrder(view.sort_order as 'asc' | 'desc')
    setSearchQuery(view.filters?.search || '')
    setStatusFilter(view.filters?.status || 'all')
    setActiveView(view)
  }

  const saveCurrentView = async () => {
    if (!currentWorkspace || !newViewName.trim()) return

    try {
      const response = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          name: newViewName,
          view_type: 'campaigns',
          columns,
          filters: { search: searchQuery, status: statusFilter },
          sort_by: sortBy,
          sort_order: sortOrder
        })
      })

      const view = await response.json()
      setSavedViews(prev => [...prev, view])
      setActiveView(view)
      setShowSaveViewModal(false)
      setNewViewName('')
    } catch (e) {
      console.error('Failed to save view:', e)
    }
  }

  const deleteView = async (viewId: string) => {
    try {
      await fetch(`/api/views/${viewId}`, { method: 'DELETE' })
      setSavedViews(prev => prev.filter(v => v.id !== viewId))
      if (activeView?.id === viewId) setActiveView(null)
    } catch (e) {
      console.error('Failed to delete view:', e)
    }
  }

  // Filter and sort campaigns
  const processedCampaigns = campaigns
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
    .sort((a, b) => {
      const aVal = sortBy === 'name' ? a.name :
                   sortBy === 'spent' ? insights[a.campaign_id]?.spend || 0 :
                   insights[a.campaign_id]?.[sortBy] || 0
      const bVal = sortBy === 'name' ? b.name :
                   sortBy === 'spent' ? insights[b.campaign_id]?.spend || 0 :
                   insights[b.campaign_id]?.[sortBy] || 0

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

  // Paginate
  const paginatedCampaigns = processedCampaigns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const totalPages = Math.ceil(processedCampaigns.length / pageSize)

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatCurrency = (num: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  const formatPercent = (num: number) => `${num.toFixed(2)}%`

  const getStatusColor = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'text-green-400 bg-green-400/10'
      case 'PAUSED': return 'text-yellow-400 bg-yellow-400/10'
      case 'COMPLETED': return 'text-blue-400 bg-blue-400/10'
      default: return 'text-slate-400 bg-slate-400/10'
    }
  }

  const toggleColumn = (colId: string) => {
    setColumns(prev =>
      prev.includes(colId)
        ? prev.filter(c => c !== colId)
        : [...prev, colId]
    )
  }

  const renderCellValue = (item: Campaign | AdSet | Ad, insight: Insight | undefined, colId: string) => {
    const currency = item.ad_account?.currency || 'USD'

    switch (colId) {
      case 'name': return item.name
      case 'status': return (
        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(item.effective_status || item.status)}`}>
          {item.effective_status || item.status || 'Unknown'}
        </span>
      )
      case 'budget': return formatCurrency((item.daily_budget || item.lifetime_budget || 0) / 100, currency)
      case 'spent': return formatCurrency(insight?.spend || 0, currency)
      case 'impressions': return formatNumber(insight?.impressions || 0)
      case 'clicks': return formatNumber(insight?.clicks || 0)
      case 'ctr': return formatPercent(insight?.ctr || 0)
      case 'cpc': return formatCurrency(insight?.cpc || 0, currency)
      case 'cpm': return formatCurrency(insight?.cpm || 0, currency)
      case 'conversions': return formatNumber(insight?.conversions || 0)
      case 'roas': return (insight?.roas || 0).toFixed(2)
      case 'reach': return formatNumber(insight?.reach || 0)
      case 'account': return item.ad_account?.name || '-'
      case 'last_synced': return item.last_synced_at ? new Date(item.last_synced_at).toLocaleString() : '-'
      default: return '-'
    }
  }

  return (
    <div className="max-w-full mx-auto px-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaign Analytics</h1>
          <p className="text-slate-400 mt-1">
            {processedCampaigns.length} campaigns • {campaigns.length} total
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split(':')
              setSortBy(by)
              setSortOrder(order as 'asc' | 'desc')
            }}
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="name:asc">Name A-Z</option>
            <option value="name:desc">Name Z-A</option>
            <option value="spent:desc">Spend (High to Low)</option>
            <option value="spent:asc">Spend (Low to High)</option>
            <option value="clicks:desc">Clicks (High to Low)</option>
            <option value="impressions:desc">Impressions (High to Low)</option>
          </select>

          {/* Columns */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white transition-colors"
            >
              <Columns3 className="w-4 h-4" />
              Columns
            </button>

            {showColumnPicker && (
              <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 w-64 max-h-80 overflow-y-auto">
                <div className="p-3 border-b border-slate-700">
                  <p className="text-sm text-slate-400">Select columns to display</p>
                </div>
                <div className="p-2">
                  {AVAILABLE_COLUMNS.map(col => (
                    <label
                      key={col.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={columns.includes(col.id)}
                        onChange={() => toggleColumn(col.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500"
                      />
                      <span className="text-white">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Saved views */}
          <div className="relative">
            <select
              value={activeView?.id || ''}
              onChange={(e) => {
                const view = savedViews.find(v => v.id === e.target.value)
                if (view) applyView(view)
              }}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Default View</option>
              {savedViews.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Save view */}
          <button
            onClick={() => setShowSaveViewModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save View
          </button>
        </div>

        {/* Active filters display */}
        {(searchQuery || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
            <span className="text-xs text-slate-500">Filters:</span>
            {searchQuery && (
              <span className="flex items-center gap-1 bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="flex items-center gap-1 bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('all')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No campaigns found</h2>
          <p className="text-slate-400">Connect a Meta account and sync your campaigns to see analytics.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-sm text-slate-400 bg-slate-800/50">
                    <th className="px-4 py-3 w-10"></th>
                    {columns.map(colId => {
                      const col = AVAILABLE_COLUMNS.find(c => c.id === colId)
                      return (
                        <th key={colId} className="px-4 py-3 font-medium whitespace-nowrap">
                          {col?.label || colId}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paginatedCampaigns.map(campaign => {
                    const insight = insights[campaign.campaign_id]
                    const isExpanded = expandedCampaigns.has(campaign.campaign_id)
                    const campaignAdsets = adsets[campaign.campaign_id] || []

                    return (
                      <>
                        {/* Campaign row */}
                        <tr
                          key={campaign.id}
                          className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleCampaign(campaign)}
                              className="p-1 hover:bg-slate-700 rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>
                          {columns.map(colId => (
                            <td key={colId} className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {colId === 'name' && (
                                  <Megaphone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                )}
                                <span className={colId === 'name' ? 'text-white font-medium' : 'text-slate-300'}>
                                  {renderCellValue(campaign, insight, colId)}
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Ad Sets (when expanded) */}
                        {isExpanded && campaignAdsets.map(adset => {
                          const adsetInsight = insights[adset.adset_id]
                          const isAdsetExpanded = expandedAdsets.has(adset.adset_id)
                          const adsetAds = ads[adset.adset_id] || []

                          return (
                            <>
                              <tr
                                key={adset.id}
                                className="border-b border-slate-700/30 bg-slate-900/30 hover:bg-slate-700/20 transition-colors"
                              >
                                <td className="px-4 py-2">
                                  <button
                                    onClick={() => toggleAdset(adset, campaign.meta_connection_id)}
                                    className="p-1 hover:bg-slate-700 rounded"
                                  >
                                    {isAdsetExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-slate-500" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-500" />
                                    )}
                                  </button>
                                </td>
                                {columns.map(colId => (
                                  <td key={colId} className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      {colId === 'name' && (
                                        <Layers className="w-4 h-4 text-green-400 flex-shrink-0" />
                                      )}
                                      <span className={colId === 'name' ? 'text-slate-200' : 'text-slate-400 text-sm'}>
                                        {renderCellValue(adset, adsetInsight, colId)}
                                      </span>
                                    </div>
                                  </td>
                                ))}
                              </tr>

                              {/* Ads (when expanded) */}
                              {isAdsetExpanded && adsetAds.map(ad => {
                                const adInsight = insights[ad.ad_id]

                                return (
                                  <tr
                                    key={ad.id}
                                    className="border-b border-slate-700/20 bg-slate-900/50 hover:bg-slate-700/20 transition-colors"
                                  >
                                    <td className="px-4 py-2">
                                      <span className="w-6 inline-block"></span>
                                    </td>
                                    {columns.map(colId => (
                                      <td key={colId} className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                          {colId === 'name' && (
                                            <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                          )}
                                          <span className={colId === 'name' ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>
                                            {renderCellValue(ad, adInsight, colId)}
                                          </span>
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                )
                              })}
                            </>
                          )
                        })}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Save View Modal */}
      {showSaveViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Save Current View</h2>
            <input
              type="text"
              placeholder="View name..."
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveViewModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentView}
                disabled={!newViewName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg py-2 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close column picker */}
      {showColumnPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowColumnPicker(false)}
        />
      )}
    </div>
  )
}
