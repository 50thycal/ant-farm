import { NextRequest, NextResponse } from 'next/server'
import { fetchUserAndCasts } from '@/lib/neynarClient'

export async function GET(request: NextRequest) {
  try {
    const fid = request.nextUrl.searchParams.get('fid')

    if (!fid || isNaN(Number(fid))) {
      return NextResponse.json(
        { error: 'Invalid or missing fid parameter' },
        { status: 400 }
      )
    }

    const data = await fetchUserAndCasts(Number(fid))

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Neynar API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}
