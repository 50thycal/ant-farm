/**
 * Neynar API helpers for AI Pet profile creation
 * Using @neynar/nodejs-sdk v2
 * Docs: https://docs.neynar.com/reference
 */

import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk'

/**
 * Get or create Neynar API client instance
 */
function getNeynarClient(): NeynarAPIClient {
  const apiKey = process.env.NEYNAR_API_KEY

  // Detailed API key validation
  if (!apiKey) {
    throw new Error(
      'NEYNAR_API_KEY environment variable is not set. Please add it to your Vercel environment variables.'
    )
  }

  // Log API key status (but never log the actual key)
  console.log('[Neynar] API key configured:', {
    keyDefined: true,
    keyLength: apiKey.length,
    keyPrefix: apiKey.substring(0, 8) + '...',
  })

  const config = new Configuration({ apiKey })
  return new NeynarAPIClient(config)
}

/**
 * Check if error is a 401 Unauthorized response
 */
function is401Error(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as any).response
    return response?.status === 401
  }
  return false
}

/**
 * Extract detailed error message from Neynar API error
 */
function extractNeynarError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as any).response
    const status = response?.status
    const data = response?.data

    if (status === 401) {
      return 'Neynar 401 Unauthorized – Your API key is invalid or doesn\'t have permission for this endpoint. Please verify:\n' +
        '1. NEYNAR_API_KEY is set to a valid server API key (not client key)\n' +
        '2. Your Neynar plan has write access for developer-managed users\n' +
        '3. The key belongs to the correct Neynar project'
    }

    if (data?.message) {
      return `Neynar API error (${status}): ${data.message}`
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error occurred'
}

/**
 * Fetch a fresh FID from Neynar
 * Uses GET /v2/farcaster/user/fid endpoint
 * Returns the newly allocated FID
 */
export async function fetchFreshFid(): Promise<number> {
  const client = getNeynarClient()

  console.log('[Neynar] Fetching fresh FID from GET /v2/farcaster/user/fid')

  try {
    const response = await client.getFreshAccountFID()

    if (!response || !response.fid) {
      throw new Error('No FID returned from Neynar')
    }

    console.log('[Neynar] Successfully allocated FID:', response.fid)
    return response.fid
  } catch (error) {
    console.error('[Neynar] Error fetching fresh FID:', error)

    if (is401Error(error)) {
      throw new Error(extractNeynarError(error))
    }

    throw new Error(
      error instanceof Error
        ? `Failed to fetch FID: ${error.message}`
        : 'Failed to fetch FID from Neynar'
    )
  }
}

/**
 * Create a managed signer
 * Uses POST /v2/farcaster/signer endpoint
 * Returns the signer UUID
 */
export async function createManagedSigner(): Promise<string> {
  const client = getNeynarClient()

  console.log('[Neynar] Creating managed signer via POST /v2/farcaster/signer')

  try {
    const response = await client.createSigner()

    if (!response || !response.signer_uuid) {
      throw new Error('No signer UUID returned from Neynar')
    }

    console.log('[Neynar] Successfully created signer:', response.signer_uuid.substring(0, 8) + '...')
    return response.signer_uuid
  } catch (error) {
    console.error('[Neynar] Error creating managed signer:', error)

    if (is401Error(error)) {
      throw new Error(extractNeynarError(error))
    }

    throw new Error(
      error instanceof Error
        ? `Failed to create signer: ${error.message}`
        : 'Failed to create signer from Neynar'
    )
  }
}

interface UpdateProfileParams {
  signerUuid: string
  displayName: string
  bio: string
  pfpUrl?: string
}

interface UpdateProfileResult {
  success: boolean
  message?: string
}

/**
 * Update user profile with display name, bio, and optional profile picture
 * Uses PATCH /v2/farcaster/user endpoint
 * Uses the managed signer to sign the update
 */
export async function updateUserProfile(
  params: UpdateProfileParams
): Promise<UpdateProfileResult> {
  const client = getNeynarClient()
  const { signerUuid, displayName, bio, pfpUrl } = params

  console.log('[Neynar] Updating user profile via PATCH /v2/farcaster/user')

  try {
    const updateParams: {
      signerUuid: string
      bio?: string
      displayName?: string
      pfpUrl?: string
    } = {
      signerUuid,
    }

    if (bio) updateParams.bio = bio
    if (displayName) updateParams.displayName = displayName
    if (pfpUrl) updateParams.pfpUrl = pfpUrl

    await client.updateUser(updateParams)

    console.log('[Neynar] Successfully updated user profile')
    return {
      success: true,
      message: 'Profile updated successfully',
    }
  } catch (error) {
    console.error('[Neynar] Error updating user profile:', error)

    if (is401Error(error)) {
      throw new Error(extractNeynarError(error))
    }

    throw new Error(
      error instanceof Error
        ? `Failed to update profile: ${error.message}`
        : 'Failed to update profile'
    )
  }
}
