"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Shield, 
  Users, 
  Key, 
  Lock, 
  UserCheck, 
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from "lucide-react"
import { 
  ROLES, 
  PERMISSIONS, 
  ROLE_PERMISSIONS, 
  ROLE_HIERARCHY,
  Role, 
  Permission,
  hasPermission,
  canManageUser,
  getRolePermissions
} from "@/lib/roles"
import { useAuthorization } from "@/hooks/use-authorization"
import { SuperAdminGuard, AdminGuard, PermissionGuard } from "@/components/rbac/rbac-guards"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UserRoleData {
  id: string
  name: string
  email: string
  role: Role
  department?: string
  lastLogin?: Date
  isActive: boolean
  mfaEnabled: boolean
  createdAt: Date
}

interface RoleAssignment {
  userId: string
  userName: string
  currentRole: Role
  proposedRole: Role
  reason: string
  requestedBy: string
  requestedAt: Date
  status: 'pending' | 'approved' | 'rejected'
}

interface PermissionAudit {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  permission: Permission
  granted: boolean
  timestamp: Date
  sessionId: string
  ipAddress?: string
}

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-300',
  admin: 'bg-red-100 text-red-800 border-red-300',
  manager: 'bg-blue-100 text-blue-800 border-blue-300',
  caterer: 'bg-green-100 text-green-800 border-green-300',
  employee: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  guest: 'bg-gray-100 text-gray-800 border-gray-300'
}

export function RBACManagementDashboard() {
  const { user, role, can, isRole } = useAuthorization()
  const [users, setUsers] = useState<UserRoleData[]>([])
  const [roleRequests, setRoleRequests] = useState<RoleAssignment[]>([])
  const [auditLogs, setAuditLogs] = useState<PermissionAudit[]>([])
  const [selectedUser, setSelectedUser] = useState<UserRoleData | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)

  // Simulate data loading
  useEffect(() => {
    // In real implementation, fetch from your API
    const mockUsers: UserRoleData[] = [
      {
        id: '1',
        name: 'John Admin',
        email: 'john@company.com',
        role: 'admin',
        department: 'IT',
        lastLogin: new Date(),
        isActive: true,
        mfaEnabled: true,
        createdAt: new Date('2024-01-15')
      },
      {
        id: '2', 
        name: 'Jane Manager',
        email: 'jane@company.com',
        role: 'manager',
        department: 'Operations',
        lastLogin: new Date(Date.now() - 86400000),
        isActive: true,
        mfaEnabled: false,
        createdAt: new Date('2024-02-01')
      },
      {
        id: '3',
        name: 'Bob Employee',
        email: 'bob@company.com', 
        role: 'employee',
        department: 'Sales',
        lastLogin: new Date(Date.now() - 172800000),
        isActive: true,
        mfaEnabled: false,
        createdAt: new Date('2024-03-01')
      },
      {
        id: '4',
        name: 'Alice Caterer',
        email: 'alice@caterer.com',
        role: 'caterer',
        lastLogin: new Date(Date.now() - 3600000),
        isActive: true,
        mfaEnabled: true,
        createdAt: new Date('2024-02-15')
      }
    ]
    setUsers(mockUsers)

    const mockRequests: RoleAssignment[] = [
      {
        userId: '2',
        userName: 'Jane Manager',
        currentRole: 'manager',
        proposedRole: 'admin',
        reason: 'Promotion to head of operations',
        requestedBy: 'HR Department',
        requestedAt: new Date(Date.now() - 3600000),
        status: 'pending'
      }
    ]
    setRoleRequests(mockRequests)

    const mockAudit: PermissionAudit[] = [
      {
        id: '1',
        userId: '1',
        userName: 'John Admin',
        action: 'read',
        resource: 'users',
        permission: 'users:read',
        granted: true,
        timestamp: new Date(),
        sessionId: 'sess_123',
        ipAddress: '192.168.1.100'
      },
      {
        id: '2',
        userId: '3',
        userName: 'Bob Employee',
        action: 'delete',
        resource: 'orders',
        permission: 'orders:delete',
        granted: false,
        timestamp: new Date(Date.now() - 1800000),
        sessionId: 'sess_456',
        ipAddress: '192.168.1.101'
      }
    ]
    setAuditLogs(mockAudit)
  }, [])

  const handleRoleChange = (userId: string, newRole: Role) => {
    if (!can('users:roles')) {
      alert('You do not have permission to change user roles')
      return
    }

    const targetUser = users.find(u => u.id === userId)
    if (targetUser && !canManageUser(role!, targetUser.role)) {
      alert('You cannot manage a user with equal or higher role level')
      return
    }

    // Update user role
    setUsers(users.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    ))
    
    console.log(`Role changed for user ${userId} to ${newRole}`)
  }

  const handleActivateUser = (userId: string) => {
    if (!can('users:activate')) {
      alert('You do not have permission to activate/deactivate users')
      return
    }

    setUsers(users.map(u => 
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    ))
  }

  const handleApproveRoleRequest = (requestId: string, approved: boolean) => {
    if (!can('roles:assign')) {
      alert('You do not have permission to approve role changes')
      return
    }

    setRoleRequests(requests => 
      requests.map(r => 
        r.userId === requestId 
          ? { ...r, status: approved ? 'approved' : 'rejected' }
          : r
      )
    )

    if (approved) {
      const request = roleRequests.find(r => r.userId === requestId)
      if (request) {
        handleRoleChange(request.userId, request.proposedRole)
      }
    }
  }

  const getRoleStats = () => {
    const stats = ROLES.reduce((acc, role) => {
      acc[role] = users.filter(u => u.role === role).length
      return acc
    }, {} as Record<Role, number>)
    return stats
  }

  const getPermissionMatrix = () => {
    return ROLES.map(role => ({
      role,
      permissions: getRolePermissions(role),
      level: ROLE_HIERARCHY[role]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RBAC Management</h1>
          <p className="text-muted-foreground">
            Manage roles, permissions, and access control
          </p>
        </div>
        <div className="flex gap-2">
          <PermissionGuard permissions="users:create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roleRequests.filter(r => r.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Enabled</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.mfaEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {users.length} users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {auditLogs.filter(a => !a.granted).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
          <TabsTrigger value="requests">Role Requests</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Users & Roles Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{user.name}</h3>
                            {!user.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {user.mfaEnabled && (
                              <Badge variant="outline" className="text-green-600">
                                <Shield className="h-3 w-3 mr-1" />
                                MFA
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.department} • Last login: {user.lastLogin?.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge className={ROLE_COLORS[user.role]}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                        
                        <PermissionGuard permissions="users:update">
                          <Select
                            value={user.role}
                            onValueChange={(value: Role) => handleRoleChange(user.id, value)}
                            disabled={!canManageUser(role!, user.role)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem 
                                  key={r} 
                                  value={r}
                                  disabled={!canManageUser(role!, r)}
                                >
                                  {r.replace('_', ' ').toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </PermissionGuard>

                        <PermissionGuard permissions="users:activate">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateUser(user.id)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Matrix Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions Matrix</CardTitle>
              <CardDescription>
                View and understand permission assignments across roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {getPermissionMatrix().map((roleData) => (
                  <div key={roleData.role} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className={ROLE_COLORS[roleData.role]}>
                        {roleData.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Level {roleData.level} • {roleData.permissions.length} permissions
                      </span>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {roleData.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Change Requests</CardTitle>
              <CardDescription>
                Review and approve role change requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roleRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                    <p>All role change requests have been processed.</p>
                  </div>
                ) : (
                  roleRequests.map((request) => (
                    <div key={request.userId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{request.userName}</h3>
                            <Badge variant="outline" className={
                              request.status === 'pending' ? 'text-yellow-600' :
                              request.status === 'approved' ? 'text-green-600' : 'text-red-600'
                            }>
                              {request.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={ROLE_COLORS[request.currentRole]}>
                              {request.currentRole.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <span>→</span>
                            <Badge className={ROLE_COLORS[request.proposedRole]}>
                              {request.proposedRole.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{request.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            Requested by {request.requestedBy} • {request.requestedAt.toLocaleDateString()}
                          </p>
                        </div>
                        
                        {request.status === 'pending' && (
                          <PermissionGuard permissions="roles:assign">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveRoleRequest(request.userId, true)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveRoleRequest(request.userId, false)}
                              >
                                Reject
                              </Button>
                            </div>
                          </PermissionGuard>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <PermissionGuard permissions="audit:read">
            <Card>
              <CardHeader>
                <CardTitle>Permission Audit Log</CardTitle>
                <CardDescription>
                  Track permission checks and access attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className={`p-3 border rounded-lg ${
                        log.granted ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {log.granted ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">{log.userName}</span>
                              <Badge variant="outline">{log.permission}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {log.action} on {log.resource} • {log.timestamp.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Session: {log.sessionId} • IP: {log.ipAddress}
                            </p>
                          </div>
                          <Badge className={log.granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {log.granted ? 'GRANTED' : 'DENIED'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
