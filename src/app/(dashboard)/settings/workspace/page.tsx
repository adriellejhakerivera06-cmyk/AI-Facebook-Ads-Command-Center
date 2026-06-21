'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { Building2, Users, Loader2, Plus, Trash2, Shield, User, MoreVertical, Crown } from 'lucide-react'
import Link from 'next/link'

type MemberWithProfile = {
  id: string
  user_id: string
  workspace_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
  users: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export default function WorkspaceSettingsPage() {
  const { currentWorkspace, membership, refreshWorkspaces } = useWorkspace()
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canManageMembers = membership?.role === 'owner' || membership?.role === 'admin'
  const isOwner = membership?.role === 'owner'

  useEffect(() => {
    if (currentWorkspace) {
      fetchMembers()
    }
  }, [currentWorkspace])

  const fetchMembers = async () => {
    if (!currentWorkspace) return

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`)
      const data = await response.json()

      if (response.ok) {
        setMembers(data)
      }
    } catch (e) {
      console.error('Failed to fetch members:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setInviting(true)

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace?.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member')
      }

      await fetchMembers()
      setInviteEmail('')
      setSuccess(`Invited ${inviteEmail} as ${inviteRole}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from this workspace?`)) return

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace?.id}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to remove member')

      await fetchMembers()
    } catch (e) {
      setError('Failed to remove member')
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace?.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) throw new Error('Failed to update role')

      await fetchMembers()
    } catch (e) {
      setError('Failed to update role')
    }
  }

  if (!canManageMembers) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          You don&apos;t have permission to manage workspace settings.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/settings"
          className="text-sm text-slate-400 hover:text-white mb-2 inline-block"
        >
          ← Back to settings
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Building2 className="w-6 h-6" />
          {currentWorkspace?.name}
        </h1>
        <p className="text-slate-400 mt-1">
          Manage workspace settings and team members.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">
          {success}
        </div>
      )}

      {/* Members section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Members
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Team members with access to this workspace
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                    {member.users.avatar_url ? (
                      <img
                        src={member.users.avatar_url}
                        alt={member.users.full_name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {member.users.full_name || 'User'}
                    </p>
                    <p className="text-sm text-slate-400">{member.users.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {member.role === 'owner' && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                    {member.role !== 'owner' && canManageMembers && member.user_id !== membership?.user_id ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded capitalize">
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>

                {canManageMembers && member.role !== 'owner' && member.user_id !== membership?.user_id && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.users.email)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Invite Member</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter email address"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as any)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-4 text-white"
          >
            <option value="viewer">Viewer</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting || !inviteEmail}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-lg transition-all"
          >
            {inviting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Invite
          </button>
        </form>
      </div>
    </div>
  )
}
