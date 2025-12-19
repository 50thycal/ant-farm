'use client'

import Sandbox from '@/src/sandbox/Sandbox'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-amber-50">
      <main className="flex-1 flex items-center justify-center p-4">
        <Sandbox />
      </main>
    </div>
  )
}
