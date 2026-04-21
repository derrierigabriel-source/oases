'use client'

import { useAuth } from '@/hooks/useAuth'

interface AdminOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <>{fallback}</>
  return <>{children}</>
}
