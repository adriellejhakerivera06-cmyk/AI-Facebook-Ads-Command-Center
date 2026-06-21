'use client'

import { useAuth } from '@/providers/AuthProvider'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Megaphone, ChartBar as BarChart3, Settings, User, LogOut, Menu, X, Building2, ChevronDown, Plus, Users, Sparkles, Activity } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ad Accounts', href: '/ad-accounts', icon: Building2 },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'AI Insights', href: '/insights', icon: Sparkles },
  { name: 'Health Score', href: '/health', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth()
  const { workspaces, currentWorkspace, membership, switchWorkspace, loading } = useWorkspace()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false)

  const canManageWorkspace = membership?.role === 'owner' || membership?.role === 'admin'

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 w-64 bg-slate-800 border-r border-slate-700">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <span className="text-xl font-bold text-white">AdPilot AI</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:bg-slate-800 lg:border-r lg:border-slate-700">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-700">
            <Link href="/dashboard" className="text-xl font-bold text-white">
              AdPilot AI
            </Link>
          </div>

          {/* Workspace selector */}
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <button
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="w-full flex items-center justify-between p-3 bg-slate-900 rounded-lg text-left hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {loading ? 'Loading...' : currentWorkspace?.name || 'No workspace'}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">
                      {membership?.role || 'member'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {workspaceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-700 border border-slate-600 rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="max-h-48 overflow-y-auto">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => {
                          switchWorkspace(workspace.id)
                          setWorkspaceDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-slate-600 transition-colors text-left ${
                          currentWorkspace?.id === workspace.id
                            ? 'bg-slate-600'
                            : ''
                        }`}
                      >
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-white truncate">
                          {workspace.name}
                        </span>
                      </button>
                    ))}
                  </div>
                  {canManageWorkspace && (
                    <div className="border-t border-slate-600">
                      <Link
                        href="/workspaces/new"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="flex items-center gap-3 p-3 text-blue-400 hover:bg-slate-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">Create workspace</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-slate-700">
            <div className="relative">
              <Link
                href="/profile"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </Link>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <div className="lg:hidden sticky top-0 z-30 bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold text-white">AdPilot AI</span>
            <div className="w-6" />
          </div>
        </div>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
