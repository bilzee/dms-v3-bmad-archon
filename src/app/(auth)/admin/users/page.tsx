'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { EditUserForm } from '@/components/auth/EditUserForm'
import { useAuth } from '@/hooks/useAuth'
import { Edit, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface User {
  id: string
  name: string
  email: string
  username: string
  isActive: boolean
  roles: Array<{
    role: {
      id: string
      name: string
    }
  }>
  createdAt: string
}

export default function UsersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const { hasPermission, token } = useAuth()

  // Fetch users from backend
  const fetchUsers = async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data.users || [])
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false)
    fetchUsers() // Refresh the list
  }

  const handleEditSuccess = () => {
    setEditDialogOpen(false)
    setSelectedUser(null)
    fetchUsers() // Refresh the list
  }

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setSelectedUser(user)
      setEditDialogOpen(true)
    }
  }

  // Prevent hydration mismatch by waiting for client-side hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Fetch users on component mount
  useEffect(() => {
    if (token && hasPermission('MANAGE_USERS')) {
      fetchUsers()
    }
  }, [token, hasPermission])

  // Main render - all hooks called before any conditional logic
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Permission check - conditional rendering, not conditional hooks */}
      {!hasPermission('MANAGE_USERS') ? (
        <Alert variant="destructive">
          <AlertDescription>
            You don&apos;t have permission to access user management.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-gray-600">Manage system users and their role assignments</p>
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>Create User</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <RegisterForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              {!isHydrated ? (
                <div className="space-y-2">
                  <div className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : loading ? (
                <div className="space-y-2">
                  <div className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No users found. Create your first user to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.roles.map((userRole) => (
                            <Badge key={userRole.role.id} variant="outline" className="mr-1">
                              {userRole.role.name}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <EditUserForm 
                  user={selectedUser}
                  isAdmin={true}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setEditDialogOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}