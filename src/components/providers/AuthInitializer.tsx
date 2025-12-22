'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'

/**
 * AuthInitializer - Initializes authentication state from localStorage on app startup
 * This component handles restoring user sessions when the app loads
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined') return
      
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const { isAuthenticated } = useAuthStore.getState()
      
      if (token && !isAuthenticated) {
        console.log('🔄 AuthInitializer: Found token, validating and restoring auth state...')
        
        try {
          const response = await fetch('/api/v1/auth/me', {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            useAuthStore.getState().setUser(data.data.user, token)
            console.log('✅ AuthInitializer: Auth state restored successfully')
          } else {
            console.log('❌ AuthInitializer: Token invalid, clearing storage')
            localStorage.removeItem('auth_token')
            localStorage.removeItem('token')
            useAuthStore.getState().logout()
          }
        } catch (error) {
          console.log('❌ AuthInitializer: Error validating token:', error)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('token')
          useAuthStore.getState().logout()
        }
      } else if (!token && isAuthenticated) {
        console.log('🔄 AuthInitializer: No token but auth state exists, clearing...')
        useAuthStore.getState().logout()
      } else {
        console.log('✅ AuthInitializer: Auth state already correct')
      }
      
      setIsInitialized(true)
    }
    
    initializeAuth()
  }, [])

  // Show loading until auth state is properly initialized
  if (!isInitialized) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Initializing...</div>
    </div>
  }

  return <>{children}</>
}