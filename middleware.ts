/**
 * Next.js Middleware with RBAC Integration
 */

import { NextRequest } from 'next/server';
import { createRBACMiddleware } from '@/lib/rbac-middleware';

// Configure RBAC middleware with ChopRek-specific rules
const rbacMiddleware = createRBACMiddleware({
  protectedRoutes: [
    // Super Admin routes
    {
      pattern: /^\/super-admin/,
      roles: ['super_admin'],
      requireAuth: true,
      requireMFA: true
    },
    
    // Admin routes
    {
      pattern: /^\/admin/,
      roles: ['admin', 'super_admin'],
      requireAuth: true
    },
    
    // Manager routes
    {
      pattern: /^\/manager/,
      minimumRole: 'manager',
      requireAuth: true
    },
    
    // Employee routes
    {
      pattern: /^\/employee/,
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireAuth: true
    },
    
    // Caterer routes
    {
      pattern: /^\/caterer/,
      roles: ['caterer', 'admin', 'super_admin'],
      requireAuth: true
    },
    
    // Profile and settings (authenticated users only)
    {
      pattern: /^\/profile/,
      requireAuth: true
    },
    {
      pattern: /^\/settings/,
      requireAuth: true
    },
    
    // Join invitation routes (special handling)
    {
      pattern: /^\/join/,
      allowAnonymous: true // Handled separately with invitation tokens
    }
  ],
  
  protectedAPI: [
    // Admin API endpoints
    {
      pattern: /^\/api\/admin/,
      roles: ['admin', 'super_admin'],
      requireAuth: true,
      rateLimit: { requests: 100, window: 60000 } // 100 requests per minute
    },
    
    // User management
    {
      pattern: /^\/api\/users/,
      methods: ['GET'],
      permissions: ['users:read'],
      requireAuth: true,
      rateLimit: { requests: 200, window: 60000 }
    },
    {
      pattern: /^\/api\/users/,
      methods: ['POST', 'PUT', 'DELETE'],
      permissions: ['users:create', 'users:update', 'users:delete'],
      requireAuth: true,
      rateLimit: { requests: 50, window: 60000 }
    },
    
    // Menu management
    {
      pattern: /^\/api\/menu/,
      methods: ['GET'],
      permissions: ['menu:read'],
      requireAuth: true,
      rateLimit: { requests: 500, window: 60000 }
    },
    {
      pattern: /^\/api\/menu/,
      methods: ['POST', 'PUT', 'DELETE'],
      permissions: ['menu:create', 'menu:update', 'menu:delete'],
      requireAuth: true,
      rateLimit: { requests: 100, window: 60000 }
    },
    
    // Order management
    {
      pattern: /^\/api\/orders/,
      methods: ['GET'],
      permissions: ['orders:read'],
      requireAuth: true,
      rateLimit: { requests: 300, window: 60000 }
    },
    {
      pattern: /^\/api\/orders/,
      methods: ['POST'],
      permissions: ['orders:create'],
      requireAuth: true,
      rateLimit: { requests: 100, window: 60000 }
    },
    {
      pattern: /^\/api\/orders/,
      methods: ['PUT', 'DELETE'],
      permissions: ['orders:update', 'orders:delete'],
      requireAuth: true,
      rateLimit: { requests: 50, window: 60000 }
    },
    
    // Reports (sensitive data)
    {
      pattern: /^\/api\/reports/,
      permissions: ['reports:sales', 'reports:analytics'],
      requireAuth: true,
      rateLimit: { requests: 50, window: 60000 }
    },
    
    // Financial data (highly sensitive)
    {
      pattern: /^\/api\/finance/,
      permissions: ['finance:read'],
      requireAuth: true,
      requireMFA: true,
      rateLimit: { requests: 20, window: 60000 }
    },
    
    // System operations (super admin only)
    {
      pattern: /^\/api\/system/,
      roles: ['super_admin'],
      requireAuth: true,
      requireMFA: true,
      rateLimit: { requests: 10, window: 60000 }
    },
    
    // Error reports (admin access)
    {
      pattern: /^\/api\/error-reports/,
      roles: ['admin', 'super_admin'],
      requireAuth: true,
      rateLimit: { requests: 100, window: 60000 }
    },
    
    // Audit logs (admin access)
    {
      pattern: /^\/api\/audit/,
      permissions: ['audit:read'],
      requireAuth: true,
      rateLimit: { requests: 50, window: 60000 }
    },
    
    // Invitations
    {
      pattern: /^\/api\/send-invitation/,
      permissions: ['users:invite'],
      requireAuth: true,
      rateLimit: { requests: 20, window: 60000 }
    },
    
    // Notifications
    {
      pattern: /^\/api\/notifications/,
      methods: ['GET'],
      requireAuth: true,
      rateLimit: { requests: 200, window: 60000 }
    },
    {
      pattern: /^\/api\/notifications/,
      methods: ['POST'],
      permissions: ['notifications:send'],
      requireAuth: true,
      rateLimit: { requests: 50, window: 60000 }
    },
    
    // Public endpoints (no auth required but rate limited)
    {
      pattern: /^\/api\/health/,
      allowAnonymous: true,
      rateLimit: { requests: 100, window: 60000 }
    },
    {
      pattern: /^\/api\/public/,
      allowAnonymous: true,
      rateLimit: { requests: 200, window: 60000 }
    }
  ],
  
  redirects: {
    unauthorized: '/auth',
    forbidden: '/403',
    mfaRequired: '/auth/mfa',
    sessionExpired: '/auth?session=expired'
  },
  
  security: {
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
    enableAuditLogging: process.env.NODE_ENV === 'production',
    enableRateLimit: true,
    enableCSRFProtection: true,
    allowedOrigins: [
      'http://localhost:3000',
      'https://choprek.vercel.app',
      // Add your production domains
    ]
  }
});

export function middleware(request: NextRequest) {
  // Skip middleware for static files and internal Next.js routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.includes('.') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return;
  }
  
  return rbacMiddleware(request);
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\..*).*),'
  ],
};
