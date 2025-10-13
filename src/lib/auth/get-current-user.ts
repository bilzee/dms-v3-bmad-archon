// Removed problematic import for development

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // For development, check for mock session in localStorage or headers
    if (typeof window !== 'undefined') {
      // Client-side - check localStorage first
      const mockUser = localStorage.getItem('mockUser')
      if (mockUser) {
        return JSON.parse(mockUser)
      }
      
      // If no mock user in localStorage, set a default one for testing
      const defaultUser: AuthUser = {
        id: '4',
        email: 'multirole@dms.gov.ng',
        name: 'Multi Role Test User',
        roles: ['ASSESSOR', 'COORDINATOR', 'DONOR']
      }
      
      localStorage.setItem('mockUser', JSON.stringify(defaultUser))
      return defaultUser
    } else {
      // Server-side - use default mock user for testing
      return {
        id: '4',
        email: 'multirole@dms.gov.ng',
        name: 'Multi Role Test User',
        roles: ['ASSESSOR', 'COORDINATOR', 'DONOR']
      }
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    // Return fallback user for development
    return {
      id: '4',
      email: 'multirole@dms.gov.ng',
      name: 'Multi Role Test User',
      roles: ['ASSESSOR', 'COORDINATOR', 'DONOR']
    }
  }
}

export function setMockUser(user: AuthUser) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mockUser', JSON.stringify(user))
  }
}