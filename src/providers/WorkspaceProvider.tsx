'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, WorkspaceMember } from '@/lib/database.types'

interface WorkspaceContextType {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  membership: WorkspaceMember | null
  loading: boolean
  switchWorkspace: (workspaceId: string) => void
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

const LAST_WORKSPACE_KEY = 'adpilot_last_workspace'

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [membership, setMembership] = useState<WorkspaceMember | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([])
      setCurrentWorkspace(null)
      setMembership(null)
      setLoading(false)
      return
    }

    try {
      // Fetch user's workspace memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('workspace_members')
        .select(`
          *,
          workspace:workspaces(*)
        `)
        .eq('user_id', user.id)

      if (membershipError) throw membershipError

      const fetchedWorkspaces = memberships
        ?.map((m) => m.workspace)
        .filter(Boolean) as unknown as Workspace[]

      setWorkspaces(fetchedWorkspaces || [])

      // Determine current workspace
      const lastWorkspaceId = localStorage.getItem(LAST_WORKSPACE_KEY)
      let workspaceToSelect: Workspace | null = null

      if (lastWorkspaceId) {
        workspaceToSelect = fetchedWorkspaces?.find(w => w.id === lastWorkspaceId) || null
      }

      if (!workspaceToSelect && fetchedWorkspaces && fetchedWorkspaces.length > 0) {
        workspaceToSelect = fetchedWorkspaces[0]
      }

      if (workspaceToSelect) {
        setCurrentWorkspace(workspaceToSelect)
        localStorage.setItem(LAST_WORKSPACE_KEY, workspaceToSelect.id)

        // Fetch membership for current workspace
        const currentMembership = memberships?.find(
          (m) => m.workspace_id === workspaceToSelect?.id
        ) as unknown as WorkspaceMember
        setMembership(currentMembership || null)
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      setWorkspaces([])
      setCurrentWorkspace(null)
      setMembership(null)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
      localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId)

      // Fetch membership for the new workspace
      const { data: member } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user?.id)
        .single()

      if (member) {
        setMembership(member as WorkspaceMember)
      }
    }
  }

  const refreshWorkspaces = async () => {
    setLoading(true)
    await fetchWorkspaces()
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        membership,
        loading,
        switchWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
