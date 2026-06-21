'use client'

import { useAuth } from '@/providers/AuthProvider'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import Link from 'next/link'
import { useState } from 'react'
import {
  Megaphone,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Building2,
  Plus,
  ArrowRight,
} from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { currentWorkspace, workspaces } = useWorkspace()

  if (!currentWorkspace) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center mb-8">
          <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to AdPilot AI</h2>
          <p className="text-slate-400 mb-6">
            Create your first workspace to start managing your Meta Ads campaigns.
          </p>
          <Link
            href="/workspaces/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Create your first workspace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-slate-400 mt-1">
          Here&apos;s an overview of your Meta Ads performance.
        </p>
      </div>

      {/* Quick stats placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Spend"
          value="$0.00"
          change="+0%"
          trend="up"
        />
        <StatCard
          title="Impressions"
          value="0"
          change="+0%"
          trend="neutral"
        />
        <StatCard
          title="Clicks"
          value="0"
          change="+0%"
          trend="neutral"
        />
        <StatCard
          title="Conversions"
          value="0"
          change="+0%"
          trend="neutral"
        />
      </div>

      {/* Getting started guide */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Getting Started</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <GettingStartedStep
            step={1}
            title="Connect Meta Account"
            description="Link your Facebook Business Manager to start syncing your ad data."
            href="/ad-accounts"
          />
          <GettingStartedStep
            step={2}
            title="View Your Campaigns"
            description="Explore your campaign performance and metrics."
            href="/campaigns"
          />
          <GettingStartedStep
            step={3}
            title="Set Up Alerts"
            description="Configure notifications for important performance changes."
            href="/settings/alerts"
          />
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recent Campaigns</h2>
            <Link
              href="/campaigns"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="text-center py-8 text-slate-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No campaigns yet</p>
            <p className="text-sm mt-1">Connect your Meta account to see campaigns</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Performance Insights</h2>
            <Link
              href="/analytics"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View analytics
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="text-center py-8 text-slate-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No data yet</p>
            <p className="text-sm mt-1">Insights will appear once you connect an ad account</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  trend,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-2xl font-bold text-white">{value}</p>
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up'
              ? 'text-green-400'
              : trend === 'down'
              ? 'text-red-400'
              : 'text-slate-500'
          }`}
        >
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4" />
          ) : null}
          {change}
        </div>
      </div>
    </div>
  )
}

function GettingStartedStep({
  step,
  title,
  description,
  href,
}: {
  step: number
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl p-5 transition-all"
    >
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold text-white mb-3">
        {step}
      </div>
      <h3 className="font-medium text-white mb-1 group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-400">{description}</p>
    </Link>
  )
}
