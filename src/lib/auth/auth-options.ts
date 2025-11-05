import { NextAuthOptions } from 'next-auth'

// Mock user data for development - replace with real auth in production
const mockUsers = [
  {
    id: '1',
    email: 'admin@dms.gov.ng',
    name: 'System Administrator',
    roles: ['ADMIN']
  },
  {
    id: '2', 
    email: 'coordinator@dms.gov.ng',
    name: 'Crisis Coordinator',
    roles: ['COORDINATOR']
  },
  {
    id: '3',
    email: 'assessor@dms.gov.ng', 
    name: 'Field Assessor',
    roles: ['ASSESSOR']
  },
  {
    id: '4',
    email: 'multirole@dms.gov.ng',
    name: 'Multi Role Test User',
    roles: ['ASSESSOR', 'COORDINATOR', 'DONOR']
  }
]

export const authOptions: NextAuthOptions = {
  providers: [
    // Mock provider for development
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = (user as any).roles || []
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).roles = token.roles as string[]
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}

// Helper function to get mock user by email for development
export function getMockUser(email: string) {
  return mockUsers.find(user => user.email === email) || null
}