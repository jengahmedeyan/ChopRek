// ===== ROLES DEFINITION =====
export const ROLES = [
  "super_admin",
  "admin", 
  "manager",
  "caterer",
  "employee",
  "guest"
] as const;

export type Role = typeof ROLES[number];

// ===== ROLE HIERARCHY =====
export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  caterer: 40,
  employee: 20,
  guest: 0
};

// ===== COMPREHENSIVE PERMISSIONS =====
export const PERMISSIONS = [
  // === SYSTEM PERMISSIONS ===
  "system:read",
  "system:write",
  "system:delete",
  "system:admin",
  "system:config",
  "system:backup",
  "system:logs",
  "system:security",
  
  // === USER MANAGEMENT ===
  "users:create",
  "users:read",
  "users:update",
  "users:delete",
  "users:list",
  "users:roles",
  "users:permissions",
  "users:impersonate",
  "users:invite",
  "users:activate",
  "users:deactivate",
  "users:export",
  
  // === ROLE MANAGEMENT ===
  "roles:create",
  "roles:read",
  "roles:update",
  "roles:delete",
  "roles:assign",
  "roles:permissions",
  
  // === MENU MANAGEMENT ===
  "menu:create",
  "menu:read",
  "menu:update",
  "menu:delete",
  "menu:publish",
  "menu:approve",
  "menu:categories",
  "menu:pricing",
  "menu:availability",
  "menu:export",
  
  // === ORDER MANAGEMENT ===
  "orders:create",
  "orders:read",
  "orders:update",
  "orders:delete",
  "orders:list",
  "orders:status",
  "orders:assign",
  "orders:fulfill",
  "orders:cancel",
  "orders:refund",
  "orders:export",
  "orders:history",
  
  // === DEPARTMENT MANAGEMENT ===
  "departments:create",
  "departments:read",
  "departments:update",
  "departments:delete",
  "departments:list",
  "departments:members",
  "departments:budgets",
  
  // === REPORTING & ANALYTICS ===
  "reports:sales",
  "reports:users",
  "reports:orders",
  "reports:financial",
  "reports:analytics",
  "reports:custom",
  "reports:export",
  "reports:schedule",
  
  // === FINANCIAL ===
  "finance:read",
  "finance:write",
  "finance:budgets",
  "finance:payments",
  "finance:refunds",
  "finance:reconcile",
  
  // === NOTIFICATIONS ===
  "notifications:send",
  "notifications:broadcast",
  "notifications:templates",
  "notifications:schedule",
  
  // === AUDIT & SECURITY ===
  "audit:read",
  "audit:export",
  "security:sessions",
  "security:devices",
  "security:2fa",
  "security:password_policy",
  
  // === CONTENT MANAGEMENT ===
  "content:create",
  "content:read",
  "content:update",
  "content:delete",
  "content:publish",
  
  // === API ACCESS ===
  "api:read",
  "api:write",
  "api:admin",
  "api:keys",
  
  // === SPECIAL PERMISSIONS ===
  "emergency:access",
  "maintenance:mode",
  "data:export",
  "data:import",
  "data:purge"
] as const;

export type Permission = typeof PERMISSIONS[number];

// ===== ROLE PERMISSIONS MAPPING =====
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    // ALL PERMISSIONS - Super admin has complete access
    ...PERMISSIONS
  ],
  
  admin: [
    // System (limited)
    "system:read",
    "system:config",
    "system:logs",
    "system:security",
    
    // Users (full)
    "users:create",
    "users:read",
    "users:update",
    "users:delete",
    "users:list",
    "users:roles",
    "users:permissions",
    "users:invite",
    "users:activate",
    "users:deactivate",
    "users:export",
    
    // Roles
    "roles:read",
    "roles:assign",
    "roles:permissions",
    
    // Menu (full)
    "menu:create",
    "menu:read",
    "menu:update",
    "menu:delete",
    "menu:publish",
    "menu:approve",
    "menu:categories",
    "menu:pricing",
    "menu:availability",
    "menu:export",
    
    // Orders (full)
    "orders:create",
    "orders:read",
    "orders:update",
    "orders:delete",
    "orders:list",
    "orders:status",
    "orders:assign",
    "orders:fulfill",
    "orders:cancel",
    "orders:refund",
    "orders:export",
    "orders:history",
    
    // Departments (full)
    "departments:create",
    "departments:read",
    "departments:update",
    "departments:delete",
    "departments:list",
    "departments:members",
    "departments:budgets",
    
    // Reports (full)
    "reports:sales",
    "reports:users",
    "reports:orders",
    "reports:financial",
    "reports:analytics",
    "reports:custom",
    "reports:export",
    "reports:schedule",
    
    // Finance
    "finance:read",
    "finance:write",
    "finance:budgets",
    "finance:payments",
    "finance:refunds",
    
    // Notifications
    "notifications:send",
    "notifications:broadcast",
    "notifications:templates",
    "notifications:schedule",
    
    // Audit
    "audit:read",
    "audit:export",
    "security:sessions",
    "security:devices",
    
    // Content
    "content:create",
    "content:read",
    "content:update",
    "content:delete",
    "content:publish",
    
    // API
    "api:read",
    "api:write",
    "api:admin",
    
    // Data
    "data:export",
    "data:import"
  ],
  
  manager: [
    // Users (limited)
    "users:read",
    "users:list",
    "users:invite",
    
    // Menu (approve only)
    "menu:read",
    "menu:update",
    "menu:approve",
    "menu:categories",
    "menu:availability",
    "menu:export",
    
    // Orders (manage)
    "orders:read",
    "orders:update",
    "orders:list",
    "orders:status",
    "orders:assign",
    "orders:fulfill",
    "orders:export",
    "orders:history",
    
    // Departments (own department)
    "departments:read",
    "departments:update",
    "departments:members",
    "departments:budgets",
    
    // Reports (limited)
    "reports:sales",
    "reports:orders",
    "reports:analytics",
    "reports:export",
    
    // Finance (read only)
    "finance:read",
    "finance:budgets",
    
    // Notifications (limited)
    "notifications:send",
    "notifications:templates",
    
    // Content (manage)
    "content:create",
    "content:read",
    "content:update",
    "content:publish",
    
    // API (limited)
    "api:read",
    
    // Data (export only)
    "data:export"
  ],
  
  caterer: [
    // Menu (full control of own menus)
    "menu:create",
    "menu:read",
    "menu:update",
    "menu:categories",
    "menu:pricing",
    "menu:availability",
    "menu:export",
    
    // Orders (own orders)
    "orders:read",
    "orders:update",
    "orders:list",
    "orders:status",
    "orders:fulfill",
    "orders:export",
    "orders:history",
    
    // Reports (own data)
    "reports:sales",
    "reports:orders",
    "reports:export",
    
    // Finance (own transactions)
    "finance:read",
    
    // Notifications (order related)
    "notifications:send",
    
    // Content (own content)
    "content:create",
    "content:read",
    "content:update",
    
    // API (read only)
    "api:read",
    
    // Data (own data export)
    "data:export"
  ],
  
  employee: [
    // Orders (own orders only)
    "orders:create",
    "orders:read",
    "orders:history",
    
    // Menu (view only)
    "menu:read",
    
    // Departments (view own)
    "departments:read",
    
    // Content (view only)
    "content:read",
    
    // API (very limited)
    "api:read"
  ],
  
  guest: [
    // Very limited read access
    "menu:read",
    "content:read"
  ]
};

// ===== RESOURCE-BASED PERMISSIONS =====
export interface ResourcePermission {
  resource: string;
  action: string;
  conditions?: {
    field: string;
    operator: "eq" | "ne" | "in" | "nin" | "gt" | "lt" | "gte" | "lte";
    value: any;
  }[];
}

// ===== SECURITY FEATURES =====
export interface SecurityContext {
  userId: string;
  role: Role;
  permissions: Permission[];
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  mfaVerified?: boolean;
  departmentId?: string;
  organizationId?: string;
}

// ===== PERMISSION CHECKING FUNCTIONS =====

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasRoleLevel(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function getEffectivePermissions(role: Role): Permission[] {
  const basePermissions = getRolePermissions(role);
  const inheritedPermissions: Permission[] = [];
  
  Object.entries(ROLE_HIERARCHY).forEach(([otherRole, level]) => {
    if (level < ROLE_HIERARCHY[role]) {
      // This role is lower, so current role inherits its permissions
      inheritedPermissions.push(...getRolePermissions(otherRole as Role));
    }
  });
  
  return [...new Set([...basePermissions, ...inheritedPermissions])];
}

export function canAccessResource(
  context: SecurityContext,
  resource: string,
  action: string,
  resourceData?: any
): boolean {
  // Check basic permission
  const permission = `${resource}:${action}` as Permission;
  if (!hasPermission(context.role, permission)) {
    return false;
  }
  
  // Additional security checks can be added here
  // e.g., department-based access, time-based access, etc.
  
  return true;
}

export function validateSecurityContext(context: SecurityContext): boolean {
  const sessionAge = Date.now() - context.lastActivity.getTime();
  const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
  
  if (sessionAge > maxSessionAge) {
    return false;
  }
  
  // Check if role is valid
  if (!ROLES.includes(context.role)) {
    return false;
  }
  
  return true;
}

export function createSecurityContext(userData: {
  id: string;
  role: Role;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  mfaVerified?: boolean;
  departmentId?: string;
  organizationId?: string;
}): SecurityContext {
  return {
    userId: userData.id,
    role: userData.role,
    permissions: getRolePermissions(userData.role),
    sessionId: userData.sessionId,
    ipAddress: userData.ipAddress,
    userAgent: userData.userAgent,
    lastActivity: new Date(),
    mfaVerified: userData.mfaVerified,
    departmentId: userData.departmentId,
    organizationId: userData.organizationId
  };
}

// ===== RBAC AUDIT FUNCTIONS =====

export interface RBACAction {
  type: 'permission_check' | 'role_change' | 'access_denied' | 'access_granted';
  userId: string;
  role: Role;
  permission?: Permission;
  resource?: string;
  action?: string;
  timestamp: Date;
  sessionId: string;
  ipAddress?: string;
  result: boolean;
  reason?: string;
}

export function logRBACAction(action: Omit<RBACAction, 'timestamp'>): void {
  const auditAction: RBACAction = {
    ...action,
    timestamp: new Date()
  };
  
  // In production, this should log to your audit system
  console.log('[RBAC AUDIT]', auditAction);
  
  // Store in audit trail (implement based on your needs)
  // auditTrail.push(auditAction);
}

// ===== ROLE UTILITIES =====

export function getSubordinateRoles(role: Role): Role[] {
  const userLevel = ROLE_HIERARCHY[role];
  return ROLES.filter(r => ROLE_HIERARCHY[r] < userLevel);
}

export function getSuperiorRoles(role: Role): Role[] {
  const userLevel = ROLE_HIERARCHY[role];
  return ROLES.filter(r => ROLE_HIERARCHY[r] > userLevel);
}

export function canManageUser(managerRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
} 