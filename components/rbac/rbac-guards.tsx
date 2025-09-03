/**
 * RBAC GUARD COMPONENTS
 * 
 * Comprehensive set of components for protecting UI elements and routes
 * based on roles, permissions, and security policies.
 */

"use client"

import React, { ReactNode } from 'react';
import { useAuthorization } from '@/hooks/use-authorization';
import { Role, Permission } from '@/lib/roles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Lock, AlertTriangle, UserX } from 'lucide-react';

// ===== BASE GUARD COMPONENT =====

interface BaseGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
  onUnauthorized?: () => void;
  logAccess?: boolean;
}

// ===== ROLE-BASED GUARDS =====

interface RoleGuardProps extends BaseGuardProps {
  allowedRoles: Role | Role[];
  requireAll?: boolean;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  requireAll = false,
  fallback,
  showFallback = false,
  onUnauthorized,
  logAccess = true
}: RoleGuardProps) {
  const { hasRole, isRole, role, logAccess: log } = useAuthorization();
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const hasAccess = requireAll 
    ? roles.every(r => isRole(r))
    : hasRole(roles);
  
  if (logAccess) {
    log('ui_component', 'role_guard', hasAccess, `Required roles: ${roles.join(', ')}`);
  }
  
  if (!hasAccess) {
    onUnauthorized?.();
    
    if (showFallback) {
      return fallback || (
        <Alert className="border-orange-200 bg-orange-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Insufficient role privileges. Required: {roles.join(', ')}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }
  
  return <>{children}</>;
}

// ===== PERMISSION-BASED GUARDS =====

interface PermissionGuardProps extends BaseGuardProps {
  permissions: Permission | Permission[];
  requireAll?: boolean;
}

export function PermissionGuard({ 
  children, 
  permissions, 
  requireAll = true,
  fallback,
  showFallback = false,
  onUnauthorized,
  logAccess = true
}: PermissionGuardProps) {
  const { can, canAll, canAny, logAccess: log } = useAuthorization();
  
  const perms = Array.isArray(permissions) ? permissions : [permissions];
  const hasAccess = perms.length === 1 
    ? can(perms[0])
    : requireAll 
      ? canAll(perms) 
      : canAny(perms);
  
  if (logAccess) {
    log('ui_component', 'permission_guard', hasAccess, `Required permissions: ${perms.join(', ')}`);
  }
  
  if (!hasAccess) {
    onUnauthorized?.();
    
    if (showFallback) {
      return fallback || (
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Insufficient permissions. Required: {perms.join(', ')}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }
  
  return <>{children}</>;
}

// ===== HIERARCHY-BASED GUARDS =====

interface HierarchyGuardProps extends BaseGuardProps {
  minimumRole: Role;
}

export function HierarchyGuard({ 
  children, 
  minimumRole,
  fallback,
  showFallback = false,
  onUnauthorized,
  logAccess = true
}: HierarchyGuardProps) {
  const { hasRoleLevel, role, logAccess: log } = useAuthorization();
  
  const hasAccess = hasRoleLevel(minimumRole);
  
  if (logAccess) {
    log('ui_component', 'hierarchy_guard', hasAccess, `Minimum role: ${minimumRole}`);
  }
  
  if (!hasAccess) {
    onUnauthorized?.();
    
    if (showFallback) {
      return fallback || (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Insufficient role level. Minimum required: {minimumRole}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }
  
  return <>{children}</>;
}

// ===== RESOURCE ACCESS GUARDS =====

interface ResourceGuardProps extends BaseGuardProps {
  resource: string;
  action: string;
  resourceData?: any;
}

export function ResourceGuard({ 
  children, 
  resource,
  action,
  resourceData,
  fallback,
  showFallback = false,
  onUnauthorized,
  logAccess = true
}: ResourceGuardProps) {
  const { canAccess } = useAuthorization();
  
  const hasAccess = canAccess(resource, action, resourceData);
  
  if (!hasAccess) {
    onUnauthorized?.();
    
    if (showFallback) {
      return fallback || (
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Access denied to {resource}:{action}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }
  
  return <>{children}</>;
}

// ===== AUTHENTICATION GUARDS =====

interface AuthGuardProps extends BaseGuardProps {
  requireAuth?: boolean;
  requireVerification?: boolean;
}

export function AuthGuard({ 
  children, 
  requireAuth = true,
  requireVerification = false,
  fallback,
  showFallback = true,
  onUnauthorized,
  logAccess = true
}: AuthGuardProps) {
  const { user, isSecurityContextValid, logAccess: log } = useAuthorization();
  
  const isAuthenticated = !!user;
  const isValidContext = isSecurityContextValid();
  const isVerified = requireVerification ? user?.mfaVerified : true;
  
  const hasAccess = requireAuth 
    ? isAuthenticated && isValidContext && isVerified
    : true;
  
  if (logAccess) {
    log('ui_component', 'auth_guard', hasAccess, 'Authentication check');
  }
  
  if (!hasAccess) {
    onUnauthorized?.();
    
    if (showFallback) {
      return fallback || (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Alert className="max-w-md border-red-200 bg-red-50">
            <UserX className="h-4 w-4" />
            <AlertDescription className="mt-2">
              {!isAuthenticated && "You must be signed in to access this content."}
              {isAuthenticated && !isValidContext && "Your session has expired. Please sign in again."}
              {isAuthenticated && isValidContext && !isVerified && "Multi-factor authentication required."}
            </AlertDescription>
            <div className="mt-4">
              <Button size="sm" onClick={() => window.location.href = '/auth'}>
                Sign In
              </Button>
            </div>
          </Alert>
        </div>
      );
    }
    
    return null;
  }
  
  return <>{children}</>;
}

// ===== COMBINED GUARDS =====

interface CombinedGuardProps extends BaseGuardProps {
  roles?: Role | Role[];
  permissions?: Permission | Permission[];
  minimumRole?: Role;
  resource?: string;
  action?: string;
  resourceData?: any;
  requireAuth?: boolean;
  requireVerification?: boolean;
  requireAllRoles?: boolean;
  requireAllPermissions?: boolean;
}

export function CombinedGuard({ 
  children,
  roles,
  permissions,
  minimumRole,
  resource,
  action,
  resourceData,
  requireAuth = true,
  requireVerification = false,
  requireAllRoles = false,
  requireAllPermissions = true,
  fallback,
  showFallback = false,
  onUnauthorized,
  logAccess = true
}: CombinedGuardProps) {
  const { 
    user, 
    hasRole, 
    isRole, 
    can, 
    canAll, 
    canAny, 
    hasRoleLevel, 
    canAccess,
    isSecurityContextValid,
    logAccess: log 
  } = useAuthorization();
  
  // Authentication check
  if (requireAuth && !user) {
    if (logAccess) log('ui_component', 'combined_guard', false, 'Authentication required');
    onUnauthorized?.();
    return showFallback ? (fallback || <div>Authentication required</div>) : null;
  }
  
  // Security context check
  if (requireAuth && !isSecurityContextValid()) {
    if (logAccess) log('ui_component', 'combined_guard', false, 'Invalid security context');
    onUnauthorized?.();
    return showFallback ? (fallback || <div>Session expired</div>) : null;
  }
  
  // MFA verification check
  if (requireVerification && !user?.mfaVerified) {
    if (logAccess) log('ui_component', 'combined_guard', false, 'MFA verification required');
    onUnauthorized?.();
    return showFallback ? (fallback || <div>MFA verification required</div>) : null;
  }
  
  // Role check
  if (roles) {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const hasRoleAccess = requireAllRoles 
      ? roleArray.every(r => isRole(r))
      : hasRole(roleArray);
    
    if (!hasRoleAccess) {
      if (logAccess) log('ui_component', 'combined_guard', false, `Role check failed: ${roleArray.join(', ')}`);
      onUnauthorized?.();
      return showFallback ? (fallback || <div>Insufficient role privileges</div>) : null;
    }
  }
  
  // Permission check
  if (permissions) {
    const permArray = Array.isArray(permissions) ? permissions : [permissions];
    const hasPermAccess = permArray.length === 1
      ? can(permArray[0])
      : requireAllPermissions 
        ? canAll(permArray)
        : canAny(permArray);
    
    if (!hasPermAccess) {
      if (logAccess) log('ui_component', 'combined_guard', false, `Permission check failed: ${permArray.join(', ')}`);
      onUnauthorized?.();
      return showFallback ? (fallback || <div>Insufficient permissions</div>) : null;
    }
  }
  
  // Hierarchy check
  if (minimumRole && !hasRoleLevel(minimumRole)) {
    if (logAccess) log('ui_component', 'combined_guard', false, `Hierarchy check failed: ${minimumRole}`);
    onUnauthorized?.();
    return showFallback ? (fallback || <div>Insufficient role level</div>) : null;
  }
  
  // Resource access check
  if (resource && action && !canAccess(resource, action, resourceData)) {
    if (logAccess) log('ui_component', 'combined_guard', false, `Resource access failed: ${resource}:${action}`);
    onUnauthorized?.();
    return showFallback ? (fallback || <div>Resource access denied</div>) : null;
  }
  
  if (logAccess) {
    log('ui_component', 'combined_guard', true, 'All checks passed');
  }
  
  return <>{children}</>;
}

// ===== CONVENIENCE GUARDS =====

// Admin only access
export function AdminGuard({ children, ...props }: Omit<BaseGuardProps, 'children'> & { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["admin", "super_admin"]} {...props}>
      {children}
    </RoleGuard>
  );
}

// Manager and above access
export function ManagerGuard({ children, ...props }: Omit<BaseGuardProps, 'children'> & { children: ReactNode }) {
  return (
    <HierarchyGuard minimumRole="manager" {...props}>
      {children}
    </HierarchyGuard>
  );
}

// Authenticated users only
export function AuthenticatedGuard({ children, ...props }: Omit<BaseGuardProps, 'children'> & { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} {...props}>
      {children}
    </AuthGuard>
  );
}

// Super admin only (highest level)
export function SuperAdminGuard({ children, ...props }: Omit<BaseGuardProps, 'children'> & { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles="super_admin" {...props}>
      {children}
    </RoleGuard>
  );
}

// ===== EXPORT ALL GUARDS =====
export {
  type BaseGuardProps,
  type RoleGuardProps,
  type PermissionGuardProps,
  type HierarchyGuardProps,
  type ResourceGuardProps,
  type AuthGuardProps,
  type CombinedGuardProps
};
