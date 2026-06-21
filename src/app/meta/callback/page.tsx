'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, AlertTriangle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function MetaCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  
  const success = searchParams.get('success')
  const error = searchParams.get('error')
  const name = searchParams.get('name')

  useEffect(() => {
    if (success === 'true') {
      setStatus('success')
      
      // Notify parent window and close popup
      if (window.opener) {
        window.opener.postMessage(
          { type: 'META_OAUTH_SUCCESS' },
          window.location.origin
        )
        setTimeout(() => window.close(), 1500)
      } else {
        // If not in popup, redirect to ad accounts
        setTimeout(() => {
          window.location.href = '/ad-accounts?success=Meta account connected'
        }, 1500)
      }
    } else if (error) {
      setStatus('error')
      
      // Notify parent window
      if (window.opener) {
        window.opener.postMessage(
          { type: 'META_OAUTH_ERROR', error },
          window.location.origin
        )
        setTimeout(() => window.close(), 3000)
      } else {
        // If not in popup, redirect to settings
        setTimeout(() => {
          window.location.href = `/settings/workspace?error=${encodeURIComponent(error)}`
        }, 3000)
      }
    }
  }, [success, error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center max-w-md px-4">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Connecting your Meta account...</h1>
            <p className="text-slate-400">Please wait while we complete the connection.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500/10 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-scaleIn">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Connected Successfully!</h1>
            {name && (
              <p className="text-slate-300 mb-2">Welcome, {name}!</p>
            )}
            <p className="text-slate-400">This window will close automatically...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Connection Failed</h1>
            <p className="text-slate-400 mb-6">{error || 'Unknown error occurred'}</p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  )
}
