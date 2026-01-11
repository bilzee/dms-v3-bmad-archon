'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<any>
  logout: () => void
  register: (userData: any) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { 
    user, 
    isAuthenticated, 
    login, 
    logout, 
    register 
  } = useAuthStore()

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    register
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}