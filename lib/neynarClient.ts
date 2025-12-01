import { NeynarAPIClient } from '@neynar/nodejs-sdk'

export interface NeynarMe {
  fid: number
  username: string
  displayName: string
  bio: string
  pfpUrl: string
  followerCount: number
  followingCount: number
  recentCasts: Array<{
    hash: string
    text: string
    timestamp: string
  }>
}

let neynarClient: NeynarAPIClient | null = null

export function getNeynarClient(): NeynarAPIClient {
  if (neynarClient) return neynarClient

  const apiKey = process.env.NEYNAR_API_KEY
  if (!apiKey) {
    throw new Error('NEYNAR_API_KEY is not set')
  }

  neynarClient = new NeynarAPIClient({ apiKey })
  return neynarClient
}

export async function fetchUserAndCasts(fid: number): Promise<NeynarMe> {
  const client = getNeynarClient()

  const userResponse = await client.fetchBulkUsers({ fids: [fid] })
  const user = userResponse.users[0]

  const castsResponse = await client.fetchFeed({
    feedType: 'following',
    fid,
    limit: 10,
  })

  return {
    fid: user.fid,
    username: user.username || '',
    displayName: user.display_name || '',
    bio: user.profile?.bio?.text || '',
    pfpUrl: user.pfp_url || '',
    followerCount: user.follower_count || 0,
    followingCount: user.following_count || 0,
    recentCasts: castsResponse.casts.map(cast => ({
      hash: cast.hash,
      text: cast.text,
      timestamp: cast.timestamp,
    })),
  }
}
