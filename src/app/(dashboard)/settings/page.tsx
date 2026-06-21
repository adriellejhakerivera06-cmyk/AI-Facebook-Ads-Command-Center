'use client'

import Link from 'next/link'
import { User, Building2, Bell, Shield, Key, Palette } from 'lucide-react'
import { useWorkspace } from '@/providers/WorkspaceProvider'

const settingsItems = [
  {
    title: 'Profile',
    description: 'Manage your personal information and preferences',
    href: '/profile',
    icon: User,
  },
  {
    title: 'Workspace',
    description: 'Configure workspace settings and members',
    href: '/settings/workspace',
    icon: Building2,
  },
  {
    title: 'Alerts & Notifications',
    description: 'Set up performance alerts and email notifications',
    href: '/settings/alerts',
    icon: Bell,
  },
  {
    title: 'Security',
    description: 'Manage password and two-factor authentication',
    href: '/settings/security',
    icon: Shield,
  },
  {
    title: 'API Keys',
    description: 'Manage API keys for integrations',
    href: '/settings/api-keys',
    icon: Key,
  },
]

export default function SettingsPage() {
  const { membership } = useWorkspace()
  const canManageWorkspace = membership?.role === 'owner' || membership?.role === 'admin'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your account and workspace settings.
        </p>
      </div>

      <div className="grid gap-4">
        {settingsItems.map((item) => {
          const isWorkspaceSetting = item.href.includes('/workspace') || item.href.includes('/alerts')
          const isDisabled = isWorkspaceSetting && !canManageWorkspace

          return (
            <Link
              key={item.href}
              href={isDisabled ? '#' : item.href}
              className={`group block bg-slate-800/50 border border-slate-700 rounded-xl p-5 transition-all ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-slate-700/50 hover:border-slate-600'
              }`}
              onClick={(e) => isDisabled && e.preventDefault()}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-slate-700 rounded-lg">
                  <item.icon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                    {isDisabled && (
                      <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                        Admin only
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
