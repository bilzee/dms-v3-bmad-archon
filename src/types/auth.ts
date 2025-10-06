import { User, Role, Permission } from '@prisma/client'

export interface AuthUser extends User {
  roles: Array<{
    role: Role & {
      permissions: Array<{
        permission: Permission
      }>
    }
  }>
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  data: {
    user: Omit<AuthUser, 'passwordHash'>
    token: string
    roles: Role[]
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface RefreshTokenRequest {
  refreshToken?: string
}

export interface RefreshTokenResponse {
  data: {
    token: string
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface CreateUserRequest {
  email: string
  username: string
  password: string
  name: string
  phone?: string
  organization?: string
  roleIds: string[]
}

export interface CreateUserResponse {
  data: {
    user: Omit<AuthUser, 'passwordHash'>
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface AssignRolesRequest {
  roleIds: string[]
}

export interface UserMeResponse {
  data: {
    user: Omit<AuthUser, 'passwordHash'>
    permissions: string[]
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface AuthState {
  user: Omit<AuthUser, 'passwordHash'> | null
  token: string | null
  isAuthenticated: boolean
  permissions: string[]
  roles: string[]
}

// Frontend hook interfaces
export interface UseAuthReturn {
  user: Omit<AuthUser, 'passwordHash'> | null
  token: string | null
  isAuthenticated: boolean
  permissions: string[]
  roles: string[]
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (...roles: string[]) => boolean
}