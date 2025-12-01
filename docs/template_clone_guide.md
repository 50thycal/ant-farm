# Template Clone Guide

Complete guide for using this Farcaster Mini App template to build your own mini app.

## Overview

This template provides a clean starting point for building Farcaster Mini Apps. It includes all the foundational plumbing (authentication, metadata, Neynar integration) while removing app-specific logic, allowing you to focus on building your unique features.

## What This Template Includes

### ✅ Core Infrastructure
- **Farcaster Authentication** - Complete QuickAuth sign-in flow
- **Mini App SDK Integration** - Properly configured Farcaster Mini App
- **Neynar Client** - Pre-configured API client for Farcaster data
- **Next.js 15** - Latest Next.js with App Router
- **TypeScript** - Full type safety throughout
- **Vercel Configuration** - Ready to deploy

### ✅ Essential Components
- `AuthCard` - Reusable authentication UI
- `useAuthSession` - Hook for managing user sessions
- API route structure - Health check and Neynar integration
- Metadata configuration - Proper fc:miniapp setup

### ❌ What Was Removed
This template was derived from a working AI Pet mini app. All AI-specific features have been removed:
- AI chat interface
- OpenAI integration
- AI profile creation
- Application-specific UI

Only the reusable mini app infrastructure remains.

## Step-by-Step Setup Guide

### Step 1: Clone the Template

```bash
# Clone this repository
git clone https://github.com/50thycal/miniapp-template.git my-new-miniapp

# Navigate to your new project
cd my-new-miniapp

# Install dependencies
pnpm install
```

Or use GitHub's "Use this template" feature to create your own repository.

### Step 2: Configure Your Environment

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Add your API keys:

```env
# Required: Get from https://neynar.com
NEYNAR_API_KEY=your_key_here

# For local development
APP_BACKEND_URL=http://localhost:3000
```

### Step 3: Update App Configuration

Edit `app/config.ts`:

```typescript
export const APP_CONFIG = {
  title: 'My Awesome Mini App',              // Your app name
  description: 'What your app does',          // Brief description
  miniAppButtonTitle: 'Launch App',          // Button text
  domain: 'YOUR-DOMAIN.vercel.app',          // Update after deployment
  appVersion: '0.1.0',
}
```

### Step 4: Update package.json

Edit `package.json`:

```json
{
  "name": "my-awesome-miniapp",
  "description": "Your app description",
  "version": "0.1.0",
  ...
}
```

### Step 5: Test Locally

Run the development server:

```bash
pnpm dev
```

Visit `http://localhost:3000` to see your mini app running with the template UI.

### Step 6: Build Your Features

Now you're ready to add your custom functionality!

## Building Your Features

### Understanding the Template Structure

```
app/
├── config.ts           # ← Update app metadata here
├── layout.tsx          # ← Contains fc:miniapp metadata (usually no changes needed)
├── page.tsx            # ← Replace template UI with your features here
└── api/
    ├── health/         # ← Keep as-is (health check)
    └── neynar/         # ← Keep as-is (Neynar integration)

components/
└── AuthCard.tsx        # ← Keep as-is (handles authentication)

hooks/
└── useAuthSession.ts   # ← Keep as-is (provides user session)

lib/
├── neynar.ts           # ← Neynar helper functions
├── neynarClient.ts     # ← Neynar SDK client
└── text.ts             # ← Text utilities
```

### Customizing the Main UI (page.tsx)

Replace the placeholder content in `app/page.tsx`:

```tsx
'use client'

import { AuthCard } from '@/components/AuthCard'
import { useAuthSession } from '@/hooks/useAuthSession'
import { APP_CONFIG } from './config'

export default function Home() {
  const { isInMiniApp, user, status } = useAuthSession()

  // Handle loading state
  if (status === 'loading') {
    return <div>Loading...</div>
  }

  // Handle not in mini app
  if (!isInMiniApp) {
    return (
      <div>
        <h1>{APP_CONFIG.title}</h1>
        <AuthCard />
      </div>
    )
  }

  // Handle signed out
  if (status === 'signedOut' || !user) {
    return (
      <div>
        <h1>{APP_CONFIG.title}</h1>
        <p>Sign in to continue</p>
        <AuthCard />
      </div>
    )
  }

  // User is signed in - build your app here!
  return (
    <div>
      <h1>{APP_CONFIG.title}</h1>
      <AuthCard />

      {/* YOUR CUSTOM FEATURES GO HERE */}
      <div>
        <h2>Welcome, {user.username || `FID ${user.fid}`}!</h2>

        {/* Add your custom UI components and features */}
        <YourCustomComponent />
      </div>
    </div>
  )
}
```

### Adding New Components

Create components in the `components/` directory:

```tsx
// components/MyFeature.tsx
'use client'

import { useAuthSession } from '@/hooks/useAuthSession'

export function MyFeature() {
  const { user } = useAuthSession()

  return (
    <div>
      <h2>My Feature</h2>
      <p>Hello, FID {user?.fid}!</p>
      {/* Your feature logic */}
    </div>
  )
}
```

Then import and use in `app/page.tsx`:

```tsx
import { MyFeature } from '@/components/MyFeature'

// In your component:
<MyFeature />
```

### Adding API Routes

Create new API endpoints in `app/api/`:

```typescript
// app/api/my-feature/route.ts
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Your server logic here
    const result = await processData(data)

    return Response.json({ success: true, result })
  } catch (error) {
    return Response.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
```

Call from your component:

```tsx
const handleAction = async () => {
  const response = await fetch('/api/my-feature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'example' }),
  })
  const result = await response.json()
}
```

### Using the Neynar Client

Access Farcaster data using the pre-configured Neynar client:

```typescript
// In an API route (server-side only)
import { neynarClient } from '@/lib/neynarClient'

export async function GET() {
  try {
    // Fetch user data
    const user = await neynarClient.fetchBulkUsers([12345])

    // Fetch casts
    const casts = await neynarClient.fetchFeed('following', {
      fid: 12345,
      limit: 10,
    })

    return Response.json({ user, casts })
  } catch (error) {
    console.error('Neynar API error:', error)
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
```

See [Neynar documentation](https://docs.neynar.com/) for all available methods.

### Accessing User Information

The `useAuthSession` hook provides user data:

```tsx
import { useAuthSession } from '@/hooks/useAuthSession'

export function MyComponent() {
  const { user, status, isInMiniApp, signIn, signOut } = useAuthSession()

  // user properties:
  // - user.fid: Farcaster ID
  // - user.username: Farcaster username
  // - user.displayName: Display name
  // - user.pfpUrl: Profile picture URL
  // - user.address: Ethereum address (after sign-in)

  if (status === 'signedIn' && user) {
    return <div>Hello, {user.username}!</div>
  }

  return <button onClick={signIn}>Sign In</button>
}
```

## Deployment Guide

### Deploying to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   NEYNAR_API_KEY=your_production_key
   APP_BACKEND_URL=https://your-app.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy your production URL

5. **Update Configuration**
   After deployment, update `app/config.ts`:
   ```typescript
   domain: 'your-app.vercel.app'  // Your actual Vercel domain
   ```

   Commit and push to trigger a redeployment:
   ```bash
   git add app/config.ts
   git commit -m "Update production domain"
   git push
   ```

### Testing in Warpcast

1. Open Warpcast mobile app
2. Create a new cast
3. Paste your mini app URL (e.g., `https://your-app.vercel.app`)
4. Warpcast will detect the mini app metadata
5. Tap the mini app button to launch
6. Test the sign-in flow and features

## Adding Preview Images

Create social preview images for your mini app:

### embed-preview.png

This image appears when your mini app is shared:

1. Create an image: **1200x630 pixels**
2. Design it to represent your mini app
3. Save as `public/embed-preview.png`
4. Redeploy

Tools for creating preview images:
- [Canva](https://www.canva.com) (templates available)
- [Figma](https://www.figma.com) (design from scratch)
- [OG Image Generator](https://og-image.vercel.app/)

### App Icon

Add an icon for your mini app:

1. Create a square icon: **512x512 pixels** (or larger)
2. Save as `public/icon.png`
3. Optional: Add `public/favicon.ico` for browser tab icon

## Advanced Customization

### Adding Styling

The template uses inline styles for simplicity. You can add any styling solution:

#### Option 1: Tailwind CSS

```bash
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js`:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import in `app/layout.tsx`:

```tsx
import './globals.css'
```

#### Option 2: CSS Modules

Create a CSS module file:

```css
/* components/MyComponent.module.css */
.container {
  padding: 20px;
  background: #f5f5f5;
}
```

Use in your component:

```tsx
import styles from './MyComponent.module.css'

export function MyComponent() {
  return <div className={styles.container}>Content</div>
}
```

### Adding Database Integration

For apps that need data persistence:

#### Option 1: Vercel Postgres

```bash
pnpm add @vercel/postgres
```

See [Vercel Postgres docs](https://vercel.com/docs/storage/vercel-postgres)

#### Option 2: Supabase

```bash
pnpm add @supabase/supabase-js
```

See [Supabase docs](https://supabase.com/docs)

### Adding More Dependencies

Install packages as needed:

```bash
# Example: Adding date utilities
pnpm add date-fns

# Example: Adding state management
pnpm add zustand

# Example: Adding form handling
pnpm add react-hook-form
```

## Common Patterns

### Protected API Routes

Verify user authentication in API routes:

```typescript
// lib/auth.ts
export async function verifyUser(request: Request) {
  // Implement your auth verification logic
  const user = await getUserFromRequest(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

// app/api/protected/route.ts
import { verifyUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await verifyUser(request)
    // User is authenticated
    return Response.json({ data: 'protected data' })
  } catch (error) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

### Loading States

Handle loading states in your UI:

```tsx
'use client'

import { useState } from 'react'

export function MyComponent() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/my-data')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (data) return <div>{/* Render data */}</div>

  return <button onClick={fetchData}>Load Data</button>
}
```

### Error Handling

Implement proper error handling:

```tsx
'use client'

import { useState } from 'react'

export function MyComponent() {
  const [error, setError] = useState<string | null>(null)

  const handleAction = async () => {
    try {
      setError(null)
      const res = await fetch('/api/action', { method: 'POST' })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Action failed')
      }

      const result = await res.json()
      // Handle success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div>
      {error && (
        <div style={{ padding: '1rem', background: '#fee', color: '#c00' }}>
          {error}
        </div>
      )}
      <button onClick={handleAction}>Perform Action</button>
    </div>
  )
}
```

## Troubleshooting

### Issue: Mini app not detected in Warpcast

**Solution:**
1. Verify `app/config.ts` has correct domain
2. Check `app/layout.tsx` metadata is properly configured
3. Ensure app is deployed and accessible
4. Clear Warpcast cache (reinstall app if needed)

### Issue: Sign-in not working

**Solution:**
1. Ensure you're testing in Warpcast (not browser)
2. Verify `NEYNAR_API_KEY` is set
3. Check browser console for errors
4. Verify `sdk.actions.ready()` is called in `useAuthSession`

### Issue: Environment variables not found

**Solution:**
1. Check `.env.local` exists (for local dev)
2. Verify variables are set in Vercel dashboard (for production)
3. Restart dev server after adding variables
4. Don't commit `.env.local` to git

### Issue: Build failing in Vercel

**Solution:**
1. Check build logs in Vercel dashboard
2. Verify all dependencies are in `package.json`
3. Ensure TypeScript types are correct
4. Test build locally: `pnpm build`

### Issue: API routes returning 404

**Solution:**
1. Verify file is named `route.ts` (not `index.ts`)
2. Check file is in correct directory structure
3. Restart dev server
4. Verify no typos in route path

## Best Practices

### Security

1. **Never expose API keys in client code**
   - Keep API keys in environment variables
   - Only use in server-side code (API routes)

2. **Validate user input**
   - Always validate data from requests
   - Sanitize user-provided content

3. **Use type safety**
   - TypeScript helps catch errors early
   - Define interfaces for your data

### Performance

1. **Optimize images**
   - Use Next.js Image component
   - Compress images before uploading

2. **Minimize client bundle**
   - Import only what you need
   - Use dynamic imports for large components

3. **Cache API responses**
   - Use Vercel KV or similar for caching
   - Reduce unnecessary API calls

### Code Organization

1. **Keep components small**
   - One component per file
   - Extract reusable logic into hooks

2. **Use clear naming**
   - Descriptive function and variable names
   - Follow React/Next.js conventions

3. **Comment complex logic**
   - Explain why, not what
   - Document API endpoints

## Next Steps

Now that you have the template set up:

1. ✅ Plan your mini app features
2. ✅ Design your UI/UX
3. ✅ Build custom components
4. ✅ Add API routes as needed
5. ✅ Test thoroughly in Warpcast
6. ✅ Deploy to production
7. ✅ Share with the Farcaster community!

## Resources

- [Farcaster Docs](https://docs.farcaster.xyz/)
- [Mini App SDK](https://github.com/farcasterxyz/miniapp-sdk)
- [Neynar API](https://docs.neynar.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

If you run into issues:

1. Check this guide's [Troubleshooting section](#troubleshooting)
2. Review the [main README](../README.md)
3. Search [Farcaster documentation](https://docs.farcaster.xyz/)
4. Ask in Farcaster developer channels
5. Open an issue on GitHub

---

**Happy building! 🚀**

Built your mini app with this template? Share it in the Farcaster community!
