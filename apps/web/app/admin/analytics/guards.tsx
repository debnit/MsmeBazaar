'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/unauthorized')
    }
  }, [status, session, router])

  if (status === 'loading') return <p>Loading...</p>
  if (session?.user?.role !== 'admin') return null

  return <>{children}</>
}

