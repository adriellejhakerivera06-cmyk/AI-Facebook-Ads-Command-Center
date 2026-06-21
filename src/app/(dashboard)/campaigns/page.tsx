'use client'

import { Megaphone, BarChart3 } from 'lucide-react'

export default function CampaignsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-slate-400 mt-1">
            View and manage your Meta ads campaigns.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Megaphone className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No campaigns yet</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Connect your Meta ad accounts to view and manage your campaigns here.
        </p>
        <p className="text-sm text-slate-500">
          Campaigns will appear once you connect an ad account.
        </p>
      </div>
    </div>
  )
}
