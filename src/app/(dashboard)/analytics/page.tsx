'use client'

import { BarChart3, TrendingUp } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1">
            Deep dive into your campaign performance metrics.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Analytics coming soon</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Connect your Meta ad accounts to view detailed analytics and insights.
        </p>
        <p className="text-sm text-slate-500">
          Charts and metrics will appear once you have connected data.
        </p>
      </div>
    </div>
  )
}
