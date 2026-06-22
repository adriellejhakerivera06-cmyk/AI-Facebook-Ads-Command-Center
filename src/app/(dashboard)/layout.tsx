'use client'

import { useAuth } from '@/providers/AuthProvider'
import { WorkspaceProvider, useWorkspace } from '@/providers/WorkspaceProvider'
import { AdAccountFilterProvider } from '@/providers/AdAccountFilterProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspace()
  
  if (!currentWorkspace) {
    return <DashboardLayout>{children}</DashboardLayout>
  }

  return (
    <AdAccountFilterProvider workspaceId={currentWorkspace.id}>
      <DashboardLayout>{children}</DashboardLayout>
    </AdAccountFilterProvider>
  )
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <WorkspaceProvider>
      <DashboardContent>{children}</DashboardContent>
    </WorkspaceProvider>
  )
}
