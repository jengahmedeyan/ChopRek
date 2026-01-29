/**
 * RBAC MIDDLEWARE FOR NEXT.JS
 * 
 * Comprehensive middleware for protecting routes and API endpoints
 * with role-based access control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  Role, 
  Permission, 
  hasPermission, 
  hasRoleLevel, 
  validateSecurityContext,
  createSecurityContext,
  logRBACAction,
  ROLE_HIERARCHY 
} from '@/lib/roles';
import { csrfProtectionMiddleware } from '@/lib/csrf-protection';

// ===== MIDDLEWARE CONFIGURATION =====

export interface RBACMiddlewareConfig {
  // Route protection patterns
  protectedRoutes: {
    pattern: string | RegExp;
    roles?: Role[];
    permissions?: Permission[];
    minimumRole?: Role;
    requireAuth?: boolean;
    requireMFA?: boolean;
    allowAnonymous?: boolean;
  }[];
  
  // API protection patterns
  protectedAPI: {
    pattern: string | RegExp;
    methods?: string[];
    roles?: Role[];
    permissions?: Permission[];
    minimumRole?: Role;
    requireAuth?: boolean;
    requireMFA?: boolean;
    allowAnonymous?: boolean;
    rateLimit?: {
      requests: number;
      window: number; // in milliseconds
    };
  }[];
  
  // Redirect configurations
  redirects: {
    unauthorized: string;
    forbidden: string;
    mfaRequired: string;
    sessionExpired: string;
  };
  
  // Security settings
  security: {
    sessionTimeout: number; // in milliseconds
    enableAuditLogging: boolean;
    enableRateLimit: boolean;
    enableCSRFProtection: boolean;
    allowedOrigins?: string[];
  };
}

// Default configuration
const DEFAULT_CONFIG: RBACMiddlewareConfig = {
  protectedRoutes: [
    {
      pattern: /^\/admin/,
      roles: ['admin', 'super_admin'],
      requireAuth: true
    },
    {
      pattern: /^\/employee/,
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireAuth: true
    },
    {
      pattern: /^\/manager/,
      minimumRole: 'manager',
      requireAuth: true
    }
  ],
  protectedAPI: [
    {
      pattern: /^\/api\/admin/,
      roles: ['admin', 'super_admin'],
      requireAuth: true
    },
    {
      pattern: /^\/api\/users/,
      permissions: ['users:read'],
      requireAuth: true
    },
    {
      pattern: /^\/api\/orders/,
      permissions: ['orders:read'],
      requireAuth: true
    }
  ],
  redirects: {
    unauthorized: '/auth',
    forbidden: '/403',
    mfaRequired: '/auth/mfa',
    sessionExpired: '/auth?expired=true'
  },
  security: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    enableAuditLogging: true,
    enableRateLimit: true,
    enableCSRFProtection: true
  }
};

// ===== MIDDLEWARE UTILITIES =====

interface UserSession {
  userId: string;
  role: Role;
  permissions: Permission[];
  sessionId: string;
  lastActivity: number;
  mfaVerified?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

const sessionStore = new Map<string, UserSession>();
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();


function extractUserSession(request: NextRequest): UserSession | null {
  try {
    // Extract session token from cookie or Authorization header
    const sessionToken = request.cookies.get('session')?.value || 
                        request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) return null;
    
    // In production, decode JWT or verify session token
    // For now, we'll use a simple lookup
    const session = sessionStore.get(sessionToken);
    
    if (!session) return null;
    
    // Check session timeout
    const now = Date.now();
    if (now - session.lastActivity > DEFAULT_CONFIG.security.sessionTimeout) {
      sessionStore.delete(sessionToken);
      return null;
    }
    
    // Update last activity
    session.lastActivity = now;
    sessionStore.set(sessionToken, session);
    
    return session;
  } catch (error) {
    console.error('Error extracting user session:', error);
    return null;
  }
}

/**
 * Check rate limit for IP address
 */
function checkRateLimit(ipAddress: string, limit: { requests: number; window: number }): boolean {
  const key = `rate_limit:${ipAddress}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.window });
    return true;
  }
  
  if (entry.count >= limit.requests) {
    return false;
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  return true;
}

/**
 * Log RBAC action for audit
 */
function logMiddlewareAction(
  request: NextRequest,
  session: UserSession | null,
  action: string,
  result: boolean,
  reason?: string
) {
  if (!DEFAULT_CONFIG.security.enableAuditLogging) return;
  
  logRBACAction({
    type: result ? 'access_granted' : 'access_denied',
    userId: session?.userId || 'anonymous',
    role: session?.role || 'guest',
    resource: 'middleware',
    action: action,
    sessionId: session?.sessionId || 'unknown',
    result,
    reason: reason || (result ? 'Access granted' : 'Access denied')
  });
}

/**
 * Check if route matches pattern
 */
function matchesPattern(path: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return path.startsWith(pattern);
  }
  return pattern.test(path);
}

/**
 * Find matching route configuration
 */
function findRouteConfig(path: string, configs: typeof DEFAULT_CONFIG.protectedRoutes) {
  return configs.find(config => matchesPattern(path, config.pattern));
}

/**
 * Find matching API configuration
 */
function findAPIConfig(path: string, method: string, configs: typeof DEFAULT_CONFIG.protectedAPI) {
  return configs.find(config => 
    matchesPattern(path, config.pattern) && 
    (!config.methods || config.methods.includes(method))
  );
}

/**
 * Validate user access against configuration
 */
function validateAccess(session: UserSession | null, config: any): { allowed: boolean; reason: string } {
  // Check if authentication is required
  if (config.requireAuth && !session) {
    return { allowed: false, reason: 'Authentication required' };
  }
  
  if (!session) {
    // Allow anonymous access if explicitly allowed
    return { 
      allowed: config.allowAnonymous || false, 
      reason: config.allowAnonymous ? 'Anonymous access allowed' : 'Authentication required' 
    };
  }
  
  // Check MFA requirement
  if (config.requireMFA && !session.mfaVerified) {
    return { allowed: false, reason: 'MFA verification required' };
  }
  
  // Check role requirements
  if (config.roles && !config.roles.includes(session.role)) {
    return { allowed: false, reason: `Role ${session.role} not in allowed roles: ${config.roles.join(', ')}` };
  }
  
  // Check minimum role requirement
  if (config.minimumRole && !hasRoleLevel(session.role, config.minimumRole)) {
    return { allowed: false, reason: `Role ${session.role} below minimum required: ${config.minimumRole}` };
  }
  
  // Check permission requirements
  if (config.permissions) {
    const hasRequiredPermissions = config.permissions.every((perm: Permission) => 
      hasPermission(session.role, perm)
    );
    
    if (!hasRequiredPermissions) {
      return { allowed: false, reason: `Missing required permissions: ${config.permissions.join(', ')}` };
    }
  }
  
  return { allowed: true, reason: 'Access granted' };
}

// ===== MAIN MIDDLEWARE FUNCTION =====

export function createRBACMiddleware(config: Partial<RBACMiddlewareConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const method = request.method;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Extract user session
    const session = extractUserSession(request);
    
    // Check if it's an API route
    const isAPI = pathname.startsWith('/api');
    
    if (isAPI) {
      // API endpoint protection
      const apiConfig = findAPIConfig(pathname, method, mergedConfig.protectedAPI);
      
      if (apiConfig) {
        // Rate limiting check
        if (mergedConfig.security.enableRateLimit && apiConfig.rateLimit) {
          const rateLimitPassed = checkRateLimit(ipAddress, apiConfig.rateLimit);
          if (!rateLimitPassed) {
            logMiddlewareAction(request, session, 'rate_limit_check', false, 'Rate limit exceeded');
            return NextResponse.json(
              { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
              { status: 429 }
            );
          }
        }
        
        // Access validation
        const { allowed, reason } = validateAccess(session, apiConfig);
        logMiddlewareAction(request, session, 'api_access_check', allowed, reason);
        
        if (!allowed) {
          if (!session) {
            return NextResponse.json(
              { error: 'Authentication required', code: 'UNAUTHORIZED' },
              { status: 401 }
            );
          } else {
            return NextResponse.json(
              { error: 'Access forbidden', code: 'FORBIDDEN', reason },
              { status: 403 }
            );
          }
        }
        
        // Add user context to request headers for API handlers
        const response = NextResponse.next();
        if (session) {
          response.headers.set('x-user-id', session.userId);
          response.headers.set('x-user-role', session.role);
          response.headers.set('x-session-id', session.sessionId);
        }
        return response;
      }
    } else {
      // Page route protection
      const routeConfig = findRouteConfig(pathname, mergedConfig.protectedRoutes);
      
      if (routeConfig) {
        // Access validation
        const { allowed, reason } = validateAccess(session, routeConfig);
        logMiddlewareAction(request, session, 'route_access_check', allowed, reason);
        
        if (!allowed) {
          const redirectUrl = new URL(request.url);
          
          if (!session) {
            // Redirect to login
            redirectUrl.pathname = mergedConfig.redirects.unauthorized;
            redirectUrl.searchParams.set('redirect', pathname + search);
          } else if (routeConfig.requireMFA && !session.mfaVerified) {
            // Redirect to MFA
            redirectUrl.pathname = mergedConfig.redirects.mfaRequired;
            redirectUrl.searchParams.set('redirect', pathname + search);
          } else {
            // Redirect to forbidden page
            redirectUrl.pathname = mergedConfig.redirects.forbidden;
            redirectUrl.searchParams.set('reason', reason);
          }
          
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
    
    // CSRF Protection for state-changing operations
    if (mergedConfig.security.enableCSRFProtection) {
      const csrfResponse = await csrfProtectionMiddleware(request);
      if (csrfResponse) {
        // CSRF validation failed or token needs to be set
        return csrfResponse;
      }
    }
    
    // Continue to the next middleware or page
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Add CSRF token for authenticated users
    if (session && mergedConfig.security.enableCSRFProtection) {
      response.headers.set('X-CSRF-Token', `csrf_${session.sessionId}`);
    }
    
    return response;
  };
}

// ===== SESSION MANAGEMENT UTILITIES =====

/**
 * Create a new session (for login)
 */
export function createSession(userData: {
  userId: string;
  role: Role;
  sessionId: string;
  mfaVerified?: boolean;
  ipAddress?: string;
  userAgent?: string;
}): string {
  const session: UserSession = {
    userId: userData.userId,
    role: userData.role,
    permissions: [], // You can populate this based on role
    sessionId: userData.sessionId,
    lastActivity: Date.now(),
    mfaVerified: userData.mfaVerified,
    ipAddress: userData.ipAddress,
    userAgent: userData.userAgent
  };
  
  // In production, this should be a secure JWT token
  const sessionToken = `session_${userData.sessionId}`;
  sessionStore.set(sessionToken, session);
  
  return sessionToken;
}

/**
 * Destroy a session (for logout)
 */
export function destroySession(sessionToken: string): boolean {
  return sessionStore.delete(sessionToken);
}

/**
 * Get session information
 */
export function getSession(sessionToken: string): UserSession | null {
  return sessionStore.get(sessionToken) || null;
}

// ===== EXPORT DEFAULT MIDDLEWARE =====
export const rbacMiddleware = createRBACMiddleware();
