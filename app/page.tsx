'use client'

import { useAuthSession } from '@/hooks/useAuthSession'
import { AuthCard } from '@/components/AuthCard'
import Sandbox from '@/src/sandbox/Sandbox'
import { APP_CONFIG } from './config'

export default function Home() {
  const { isInMiniApp, user, status } = useAuthSession()

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  if (!isInMiniApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-amber-50">
        <div className="w-full text-center">
          <h1 className="text-2xl font-bold mb-2">{APP_CONFIG.title}</h1>
          <p className="text-gray-600 mb-4">{APP_CONFIG.description}</p>
          <AuthCard />
          <div className="mt-6">
            <Sandbox />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'signedOut' || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">{APP_CONFIG.title}</h1>
          <p className="text-gray-600 mb-4">{APP_CONFIG.description}</p>
          <p className="text-sm text-gray-500 mb-4">
            Sign in with Farcaster to continue.
          </p>
          <AuthCard />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-amber-50">
      {/* Header */}
      <header className="p-4 border-b border-amber-200 bg-white text-center">
        <h1 className="text-xl font-bold text-amber-800 mb-1">
          {APP_CONFIG.title}
        </h1>
        {user && (
          <p className="text-xs text-gray-500">
            FID: {user.fid}{user.username && ` (@${user.username})`}
          </p>
        )}
      </header>

      {/* Sandbox */}
      <main className="flex-1 flex items-center justify-center">
        <Sandbox />
      </main>
    </div>
  )
}
