'use client'

import { useCallback, useEffect, useState } from 'react'
import sdk from '@farcaster/miniapp-sdk'
import type { Context } from '@farcaster/miniapp-core'

interface User {
  fid: number
  address: string
  username?: string
  displayName?: string
  pfpUrl?: string
  signature?: string
  message?: string
}

function generateNonce(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

export function useAuthSession() {
  const [status, setStatus] = useState<'loading' | 'signedOut' | 'signedIn'>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInMiniApp, setIsInMiniApp] = useState<boolean | null>(null)

  // CRITICAL: Signal to Farcaster that app is ready
  useEffect(() => {
    sdk.actions.ready()

    sdk.isInMiniApp().then((inMiniApp) => {
      setIsInMiniApp(inMiniApp)
      if (!inMiniApp) {
        setStatus('signedOut')
      }
    })
  }, [])

  // Load user context when in miniapp
  useEffect(() => {
    if (isInMiniApp === false) {
      setStatus('signedOut')
      return
    }

    if (isInMiniApp === null) {
      return
    }

    let mounted = true

    async function loadContext() {
      try {
        const context: Context.MiniAppContext = await sdk.context
        if (!mounted) return

        if (context.user?.fid) {
          setUser({
            fid: context.user.fid,
            address: '', // Will be populated on explicit sign-in
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
          })
          setStatus('signedIn')
        } else {
          setStatus('signedOut')
        }
      } catch (err) {
        if (!mounted) return
        console.error('Error loading MiniApp context:', err)
        setError(err instanceof Error ? err.message : 'Failed to load context')
        setStatus('signedOut')
      }
    }

    loadContext()

    return () => {
      mounted = false
    }
  }, [isInMiniApp])

  const signIn = useCallback(async () => {
    if (isInMiniApp === false) {
      setError('Sign-in only works when this app is opened as a Farcaster Mini App.')
      return
    }

    try {
      setStatus('loading')
      setError(null)

      const nonce = generateNonce(16)
      const result = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true,
      })

      if (!result || !result.signature || !result.message) {
        throw new Error('Invalid sign-in response from host')
      }

      // Parse FID from message
      const fidMatch = result.message.match(/farcaster:\/\/fid\/(\d+)/)
      const fid = fidMatch?.[1]

      if (!fid) {
        throw new Error('Could not parse FID from sign-in message')
      }

      // Parse address from message
      let addressMatch = result.message.match(/account:\s*(0x[a-fA-F0-9]{40})/)
      if (!addressMatch) {
        addressMatch = result.message.match(/^(0x[a-fA-F0-9]{40})\s*$/m)
      }
      const address = addressMatch?.[1] || ''

      setUser({
        fid: Number.parseInt(fid, 10),
        address,
        signature: result.signature,
        message: result.message,
      })
      setStatus('signedIn')
    } catch (err) {
      console.error('Sign-in error:', err)
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      setStatus('signedOut')
    }
  }, [isInMiniApp])

  const signOut = useCallback(() => {
    setUser(null)
    setStatus('signedOut')
    setError(null)
  }, [])

  return {
    status,
    user,
    error,
    isInMiniApp: isInMiniApp ?? false,
    signIn,
    signOut,
  }
}
