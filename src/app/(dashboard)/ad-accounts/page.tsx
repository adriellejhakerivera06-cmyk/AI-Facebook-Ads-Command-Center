'use client'

import { Building2, Plus, Link2 } from 'lucide-react'
import Link from 'next/link'

export default function AdAccountsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Ad Accounts</h1>
          <p className="text-slate-400 mt-1">
            Connect and manage your Meta ad accounts.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg transition-all">
          <Plus className="w-5 h-5" />
          Connect Account
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No ad accounts connected</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Connect your Meta Business Manager to start syncing your ad accounts and campaigns.
        </p>
        <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-all">
          <Link2 className="w-5 h-5" />
          Connect Meta Account
        </button>
        <p className="text-xs text-slate-500 mt-4">
          You&apos;ll be redirected to Facebook to authorize access.
        </p>
      </div>
    </div>
  )
}
