'use client'

import { useState } from 'react'
import { AuthCard } from '@/components/AuthCard'
import { useAuthSession } from '@/hooks/useAuthSession'
import { AntFarmCanvas } from '@/src/ui/AntFarmCanvas'
import { ControlsPanel } from '@/src/ui/ControlsPanel'
import type { GameState } from '@/src/sim/gameState'
import { APP_CONFIG } from './config'

export default function Home() {
  const { isInMiniApp, user, status } = useAuthSession()
  const [gameState, setGameState] = useState<GameState | null>(null)

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isInMiniApp) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
      }}>
        <div style={{ maxWidth: '28rem', width: '100%' }}>
          <h1>{APP_CONFIG.title}</h1>
          <p>{APP_CONFIG.description}</p>
          <AuthCard />
        </div>
      </div>
    )
  }

  if (status === 'signedOut' || !user) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
      }}>
        <div style={{ maxWidth: '28rem', width: '100%' }}>
          <h1>{APP_CONFIG.title}</h1>
          <p>{APP_CONFIG.description}</p>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            Sign in with Farcaster to continue.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <AuthCard />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #ddd',
        textAlign: 'center',
      }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
          {APP_CONFIG.title}
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
          {APP_CONFIG.description}
        </p>
        {user && (
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#999' }}>
            FID: {user.fid}{user.username && ` (@${user.username})`}
          </p>
        )}
      </div>

      {/* Ant Farm Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AntFarmCanvas onGameStateChange={setGameState} />
        <ControlsPanel gameState={gameState ?? undefined} />
      </div>
    </div>
  )
}
