"use client"

import { useAuth } from "@/lib/auth-context";
import { 
  hasPermission, 
  hasAllPermissions,
  hasAnyPermission,
  hasRoleLevel,
  canManageUser,
  canAccessResource,
  createSecurityContext,
  validateSecurityContext,
  logRBACAction,
  getRolePermissions,
  getEffectivePermissions,
  Permission, 
  Role,
  SecurityContext,
  ROLE_HIERARCHY
} from "@/lib/roles";
import { useCallback, useMemo } from "react";

export interface AuthorizationHook {
  // Basic checks
  isRole: (role: Role) => boolean;
  hasRole: (roles: Role[]) => boolean;
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  
  // Hierarchy checks
  hasRoleLevel: (requiredRole: Role) => boolean;
  canManageRole: (targetRole: Role) => boolean;
  isHigherRole: (compareRole: Role) => boolean;
  
  // Resource access
  canAccess: (resource: string, action: string, resourceData?: any) => boolean;
  
  // Security context
  getSecurityContext: () => SecurityContext | null;
  isSecurityContextValid: () => boolean;
  
  // User management
  canManageUser: (targetUserRole: Role) => boolean;
  canViewUser: (targetUserId: string) => boolean;
  canEditUser: (targetUserId: string) => boolean;
  canDeleteUser: (targetUserId: string) => boolean;
  
  // Permission utilities
  getAllPermissions: () => Permission[];
  getEffectivePermissions: () => Permission[];
  
  // Audit and logging
  logAccess: (resource: string, action: string, result: boolean, reason?: string) => void;
  
  // Current user info
  user: any;
  logout: () => void;
  role: Role | null;
  permissions: Permission[];
  roleLevel: number;
}

export function useAuthorization(): AuthorizationHook {
  const { user, logout } = useAuth();

  // Memoized values for performance
  const role = useMemo(() => user?.role as Role || null, [user?.role]);
  const permissions = useMemo(() => role ? getRolePermissions(role) : [], [role]);
  const roleLevel = useMemo(() => role ? ROLE_HIERARCHY[role] : 0, [role]);

  // Security context creation
  const getSecurityContext = useCallback((): SecurityContext | null => {
    if (!user || !role) return null;
    
    return createSecurityContext({
      id: user.id,
      role: role,
      sessionId: user.sessionId || 'unknown',
      ipAddress: user.ipAddress,
      userAgent: navigator.userAgent,
      mfaVerified: user.mfaVerified,
      departmentId: user.departmentId,
      organizationId: user.organizationId
    });
  }, [user, role]);

  // Security context validation
  const isSecurityContextValid = useCallback((): boolean => {
    const context = getSecurityContext();
    return context ? validateSecurityContext(context) : false;
  }, [getSecurityContext]);

  // Basic role checks
  const isRole = useCallback((checkRole: Role): boolean => {
    const result = role === checkRole;
    logRBACAction({
      type: 'permission_check',
      userId: user?.id || 'unknown',
      role: role || 'guest',
      resource: 'role',
      action: 'check',
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: `Role check: ${checkRole}`
    });
    return result;
  }, [role, user]);

  const hasRole = useCallback((roles: Role[]): boolean => {
    const result = role ? roles.includes(role) : false;
    logRBACAction({
      type: 'permission_check',
      userId: user?.id || 'unknown',
      role: role || 'guest',
      resource: 'roles',
      action: 'check',
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: `Role check in: [${roles.join(', ')}]`
    });
    return result;
  }, [role, user]);

  // Permission checks
  const can = useCallback((permission: Permission): boolean => {
    if (!role) return false;
    const result = hasPermission(role, permission);
    
    logRBACAction({
      type: 'permission_check',
      userId: user?.id || 'unknown',
      role: role,
      permission: permission,
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: result ? 'Permission granted' : 'Permission denied'
    });
    
    return result;
  }, [role, user]);

  const canAll = useCallback((checkPermissions: Permission[]): boolean => {
    if (!role) return false;
    const result = hasAllPermissions(role, checkPermissions);
    
    logRBACAction({
      type: 'permission_check',
      userId: user?.id || 'unknown',
      role: role,
      resource: 'permissions',
      action: 'check_all',
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: `All permissions check: [${checkPermissions.join(', ')}]`
    });
    
    return result;
  }, [role, user]);

  const canAny = useCallback((checkPermissions: Permission[]): boolean => {
    if (!role) return false;
    const result = hasAnyPermission(role, checkPermissions);
    
    logRBACAction({
      type: 'permission_check',
      userId: user?.id || 'unknown',
      role: role,
      resource: 'permissions',
      action: 'check_any',
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: `Any permissions check: [${checkPermissions.join(', ')}]`
    });
    
    return result;
  }, [role, user]);

  // Hierarchy checks
  const hasRoleLevelCheck = useCallback((requiredRole: Role): boolean => {
    if (!role) return false;
    const result = hasRoleLevel(role, requiredRole);
    
    logRBACAction({
      type: 'permission_check',
      userId: user?.id || 'unknown',
      role: role,
      resource: 'role_hierarchy',
      action: 'check',
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: `Role level check: ${requiredRole}`
    });
    
    return result;
  }, [role, user]);

  const canManageRole = useCallback((targetRole: Role): boolean => {
    if (!role) return false;
    const result = canManageUser(role, targetRole);
    
    logRBACAction({
      type: 'permission_check',
      userId: user?.id || 'unknown',
      role: role,
      resource: 'role_management',
      action: 'check',
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: `Can manage role: ${targetRole}`
    });
    
    return result;
  }, [role, user]);

  const isHigherRole = useCallback((compareRole: Role): boolean => {
    if (!role) return false;
    const result = ROLE_HIERARCHY[role] > ROLE_HIERARCHY[compareRole];
    
    logRBACAction({
      type: 'permission_check',
      userId: user?.id || 'unknown',
      role: role,
      resource: 'role_comparison',
      action: 'check',
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: `Higher role check vs: ${compareRole}`
    });
    
    return result;
  }, [role, user]);

  // Resource access
  const canAccess = useCallback((resource: string, action: string, resourceData?: any): boolean => {
    const context = getSecurityContext();
    if (!context) return false;
    
    const result = canAccessResource(context, resource, action, resourceData);
    
    logRBACAction({
      type: result ? 'access_granted' : 'access_denied',
      userId: user?.id || 'unknown',
      role: role || 'guest',
      resource: resource,
      action: action,
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: result ? 'Access granted' : 'Access denied'
    });
    
    return result;
  }, [getSecurityContext, role, user]);

  // User management helpers
  const canManageUserCheck = useCallback((targetUserRole: Role): boolean => {
    if (!role) return false;
    return canManageUser(role, targetUserRole) && can('users:update');
  }, [role, can]);

  const canViewUser = useCallback((targetUserId: string): boolean => {
    if (!user) return false;
    
    // Users can always view their own profile
    if (user.id === targetUserId) return true;
    
    // Check permission
    return can('users:read');
  }, [user, can]);

  const canEditUser = useCallback((targetUserId: string): boolean => {
    if (!user) return false;
    
    // Users can edit their own profile (limited)
    if (user.id === targetUserId) return can('users:read'); // Basic self-edit
    
    // Check permission for editing others
    return can('users:update');
  }, [user, can]);

  const canDeleteUser = useCallback((targetUserId: string): boolean => {
    if (!user) return false;
    
    // Users cannot delete themselves
    if (user.id === targetUserId) return false;
    
    // Check permission
    return can('users:delete');
  }, [user, can]);

  // Permission utilities
  const getAllPermissions = useCallback((): Permission[] => {
    return permissions;
  }, [permissions]);

  const getEffectivePermissionsFunc = useCallback((): Permission[] => {
    if (!role) return [];
    return getEffectivePermissions(role);
  }, [role]);

  // Audit logging
  const logAccess = useCallback((resource: string, action: string, result: boolean, reason?: string): void => {
    logRBACAction({
      type: result ? 'access_granted' : 'access_denied',
      userId: user?.id || 'unknown',
      role: role || 'guest',
      resource: resource,
      action: action,
      sessionId: user?.sessionId || 'unknown',
      result,
      reason: reason || (result ? 'Access granted' : 'Access denied')
    });
  }, [user, role]);

  return {
    // Basic checks
    isRole,
    hasRole,
    can,
    canAll,
    canAny,
    
    // Hierarchy checks
    hasRoleLevel: hasRoleLevelCheck,
    canManageRole,
    isHigherRole,
    
    // Resource access
    canAccess,
    
    // Security context
    getSecurityContext,
    isSecurityContextValid,
    
    // User management
    canManageUser: canManageUserCheck,
    canViewUser,
    canEditUser,
    canDeleteUser,
    
    // Permission utilities
    getAllPermissions,
    getEffectivePermissions: getEffectivePermissionsFunc,
    
    // Audit and logging
    logAccess,
    
    // Current user info
    user,
    logout,
    role,
    permissions,
    roleLevel
  };
}