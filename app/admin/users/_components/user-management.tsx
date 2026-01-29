"use client"

import { useState, useEffect, useCallback } from "react"
import { User } from "@/lib/types"
import { Role } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Download, Users, Mail, Trash2 } from "lucide-react"
import { createUser, updateUser, subscribeToUsers, deleteUser } from "@/services/users"
import { createInvitation, getPendingInvitations, isInvitationExpired } from "@/services/invitations"
import { useIsMobile } from "@/hooks/use-mobile"
import { DataTable } from "./data-table"
import { getColumns } from "./columns"
import UserCard from "./user-card"
import type { RowSelectionState } from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface UserManagementProps {
  className?: string
}

export function UserManagement({ className }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    role: "employee" as Role,
    department: "",
    inviteMessage: ""
  })

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const unsubscribe = await subscribeToUsers((usersData) => {
          setUsers(usersData)
          setLoading(false)
        })

        return () => unsubscribe()
      } catch (error) {
        console.error("Error fetching users:", error)
        setLoading(false)
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive"
        })
      }
    }

    const fetchInvitations = async () => {
      try {
        const invitations = await getPendingInvitations()
        setPendingInvitations(invitations)
      } catch (error) {
        console.error("Error fetching invitations:", error)
      }
    }

    fetchUsers()
    fetchInvitations()
  }, [toast])

  const handleAddUser = async () => {
    try {
      if (!formData.email || !formData.displayName) {
        toast({
          title: "Validation Error",
          description: "Email and name are required",
          variant: "destructive"
        })
        return
      }

      const invitation = {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        department: formData.department,
        invitedBy: "admin",
        inviteMessage: formData.inviteMessage
      }

      await createInvitation(invitation)
      
      toast({
        title: "Success",
        description: "User invitation sent successfully",
      })

      setIsAddUserOpen(false)
      setFormData({
        email: "",
        displayName: "",
        role: "employee",
        department: "",
        inviteMessage: ""
      })

      const invitations = await getPendingInvitations()
      setPendingInvitations(invitations)
    } catch (error) {
      console.error("Error adding user:", error)
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive"
      })
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      await updateUser(selectedUser.uid, {
        displayName: formData.displayName,
        role: formData.role,
        department: formData.department
      })

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      setIsEditUserOpen(false)
      setSelectedUser(null)
      setFormData({
        email: "",
        displayName: "",
        role: "employee",
        department: "",
        inviteMessage: ""
      })
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId)
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const handleBulkDelete = async () => {
    try {
      for (const userId of selectedUserIds) {
        await deleteUser(userId)
      }
      
      setSelectedUserIds([])
      toast({
        title: "Success",
        description: `${selectedUserIds.length} users deleted successfully`,
      })
    } catch (error) {
      console.error("Error deleting users:", error)
      toast({
        title: "Error",
        description: "Failed to delete some users",
        variant: "destructive"
      })
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email || "",
      displayName: user.displayName || "",
      role: user.role,
      department: user.department || "",
      inviteMessage: ""
    })
    setIsEditUserOpen(true)
  }

  const getUniqueDepartments = () => {
    const departments = users.map(user => user.department).filter(Boolean) as string[]
    return [...new Set(departments)]
  }

  const handleRowSelectionChange = useCallback((rowSelection: RowSelectionState) => {
    const selectedIds = Object.keys(rowSelection).map(index => users[parseInt(index)].uid)
    setSelectedUserIds(selectedIds)
  }, [users])

  const exportUsers = () => {
    const csvContent = [
      ["Name", "Email", "Role", "Department", "Joined Date"],
      ...users.map(user => [
        user.displayName || "",
        user.email || "",
        user.role,
        user.department || "",
        user.createdAt.toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "users.csv"
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Users exported successfully",
    })
  }

  const columns = getColumns({
    onEdit: openEditDialog,
    onDelete: handleDeleteUser,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your team members and their access permissions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={exportUsers}
            className="h-9 sm:h-10 text-xs sm:text-sm"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Export</span>
            <span className="xs:hidden">📥</span>
          </Button>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 sm:h-10 text-xs sm:text-sm">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Add User</span>
                <span className="xs:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to a new team member. They will receive an email to set up their account.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@company.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Full Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: "admin" | "employee") => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={formData.department || "custom"} 
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setFormData({ ...formData, department: "" })
                      } else {
                        setFormData({ ...formData, department: value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueDepartments().map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                      <SelectItem value="custom">+ Add Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {(!formData.department || formData.department === "") && (
                    <Input
                      placeholder="Enter custom department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inviteMessage">Personal Message (Optional)</Label>
                  <Textarea
                    id="inviteMessage"
                    value={formData.inviteMessage}
                    onChange={(e) => setFormData({ ...formData, inviteMessage: e.target.value })}
                    placeholder="Add a personal message to the invitation email..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {users.filter(u => u.role === "admin").length} admins, {users.filter(u => u.role === "employee").length} employees
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              All users active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Depts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{getUniqueDepartments().length}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Departments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Pending Invitations ({pendingInvitations.length})</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Users who have been invited but haven't joined yet
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead className="hidden lg:table-cell">Invited</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.displayName}</TableCell>
                        <TableCell className="hidden sm:table-cell">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant={invitation.role === "admin" ? "default" : "secondary"} className="text-xs">
                            {invitation.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{invitation.department || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {invitation.invitedAt.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={isInvitationExpired(invitation) ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {isInvitationExpired(invitation) ? "Expired" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedUserIds.length > 0 && !isMobile && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedUserIds.length} user(s) selected
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Users</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedUserIds.length} user(s)? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users View */}
      {isMobile ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold px-1">Users ({users.length})</h2>
          {users.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No users found
              </CardContent>
            </Card>
          ) : (
            users.map((user) => (
              <UserCard
                key={user.uid}
                user={user}
                onEdit={openEditDialog}
                onDelete={handleDeleteUser}
              />
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable 
              columns={columns} 
              data={users} 
              departments={getUniqueDepartments()}
              onRowSelectionChange={handleRowSelectionChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-displayName">Full Name</Label>
              <Input
                id="edit-displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value: "admin" | "employee") => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select 
                value={formData.department || "custom"} 
                onValueChange={(value) => {
                  if (value === "custom") {
                    setFormData({ ...formData, department: "" })
                  } else {
                    setFormData({ ...formData, department: value })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {getUniqueDepartments().map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                  <SelectItem value="custom">+ Add Custom</SelectItem>
                </SelectContent>
              </Select>
              {(!formData.department || formData.department === "") && (
                <Input
                  placeholder="Enter custom department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
