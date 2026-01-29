/**
 * CSRF Protection Implementation
 * 
 * Provides CSRF token generation and validation for protecting
 * state-changing operations (POST, PUT, DELETE, PATCH).
 */

import { NextRequest, NextResponse } from 'next/server';

// CSRF configuration
const CSRF_CONFIG = {
  tokenLength: 32,
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  },
  // Methods that require CSRF protection
  protectedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  // Paths exempt from CSRF protection (e.g., auth endpoints)
  exemptPaths: [
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/verify-invitation',
    '/api/accept-invitation',
  ],
};

const encoder = new TextEncoder();
let cachedHmacKey: Promise<CryptoKey> | null = null;

function getHmacKey(): Promise<CryptoKey> {
  if (cachedHmacKey) return cachedHmacKey;
  cachedHmacKey = (async () => {
    const keyData = encoder.encode(CSRF_CONFIG.secret);
    return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  })();
  return cachedHmacKey;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Generate a CSRF token (hex string)
 */
export function generateCSRFToken(): string {
  const arr = new Uint8Array(CSRF_CONFIG.tokenLength);
  crypto.getRandomValues(arr);
  return bufferToHex(arr.buffer);
}

/**
 * Create a signed CSRF token (token.signature) using HMAC-SHA256 (Web Crypto)
 */
export async function signCSRFToken(token: string): Promise<string> {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(token));
  return `${token}.${bufferToHex(signature)}`;
}

/**
 * Verify a signed CSRF token using Web Crypto
 */
export async function verifyCSRFToken(signedToken: string): Promise<boolean> {
  try {
    const [token, signature] = signedToken.split('.');
    if (!token || !signature) return false;

    const key = await getHmacKey();
    const signatureBuf = hexToBuffer(signature);
    const verified = await crypto.subtle.verify('HMAC', key, signatureBuf, encoder.encode(token));

    return verified;
  } catch (error) {
    console.error('CSRF token verification error:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Get CSRF token from request
 */
export async function getCSRFTokenFromRequest(request: NextRequest): Promise<string | null> {
  // Check header first
  const headerToken = request.headers.get(CSRF_CONFIG.headerName);
  if (headerToken) return headerToken;

  // Check form data for urlencoded bodies
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const text = await request.text();
      const params = new URLSearchParams(text);
      return params.get('csrf-token') || params.get('csrf_token') || null;
    } catch (e) {
      // Ignore body parsing errors
    }
  }

  return null;
}

/**
 * Get CSRF token from cookie
 */
export function getCSRFTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_CONFIG.cookieName)?.value || null;
}

/**
 * Set CSRF token in response cookie
 */
export function setCSRFTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(
    CSRF_CONFIG.cookieName,
    token,
    CSRF_CONFIG.cookieOptions
  );
}

/**
 * Check if path is exempt from CSRF protection
 */
export function isExemptPath(pathname: string): boolean {
  return CSRF_CONFIG.exemptPaths.some(exemptPath => 
    pathname.startsWith(exemptPath)
  );
}

/**
 * Check if method requires CSRF protection
 */
export function requiresCSRFProtection(method: string): boolean {
  return CSRF_CONFIG.protectedMethods.includes(method.toUpperCase());
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  const method = request.method.toUpperCase();
  const pathname = request.nextUrl.pathname;

  // Skip validation for safe methods (GET, HEAD, OPTIONS)
  if (!requiresCSRFProtection(method)) {
    return true;
  }

  // Skip validation for exempt paths
  if (isExemptPath(pathname)) {
    return true;
  }

  // Get tokens from request and cookie
  const requestToken = await getCSRFTokenFromRequest(request);
  const cookieToken = getCSRFTokenFromCookie(request);

  // Both tokens must exist
  if (!requestToken || !cookieToken) {
    console.warn('CSRF validation failed: Missing token', {
      pathname,
      method,
      hasRequestToken: !!requestToken,
      hasCookieToken: !!cookieToken,
    });
    return false;
  }

  // Verify the request token signature
  if (!(await verifyCSRFToken(requestToken))) {
    console.warn('CSRF validation failed: Invalid token signature', {
      pathname,
      method,
    });
    return false;
  }

  // Compare tokens (constant-time comparison)
  if (!timingSafeEqual(requestToken, cookieToken)) {
    console.warn('CSRF validation failed: Token mismatch', {
      pathname,
      method,
    });
    return false;
  }

  return true;
}

/**
 * Middleware to handle CSRF protection
 */
export async function csrfProtectionMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const method = request.method.toUpperCase();
  const pathname = request.nextUrl.pathname;

  // Generate and set CSRF token for GET requests
  if (method === 'GET' && !isExemptPath(pathname)) {
    const cookieToken = getCSRFTokenFromCookie(request);
    
    if (!cookieToken) {
      const token = generateCSRFToken();
      const signedToken = await signCSRFToken(token);
      
      const response = NextResponse.next();
      setCSRFTokenCookie(response, signedToken);
      
      // Also set token in response header for client-side access
      response.headers.set(CSRF_CONFIG.headerName, signedToken);
      
      return response;
    }
  }

  // Validate CSRF token for state-changing requests
  if (requiresCSRFProtection(method)) {
    if (!(await validateCSRFToken(request))) {
      return NextResponse.json(
        {
          error: 'Invalid CSRF token',
          message: 'CSRF validation failed. Please refresh the page and try again.',
        },
        { status: 403 }
      );
    }
  }

  return null; // Continue to next middleware
}

/**
 * Hook for client-side CSRF token management
 * Usage: const csrfToken = useCSRFToken();
 */
export function getCSRFTokenForClient(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Get from cookie
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith(`${CSRF_CONFIG.cookieName}=`)
  );
  
  if (csrfCookie) {
    return csrfCookie.split('=')[1];
  }
  
  return null;
}

/**
 * Add CSRF token to fetch request headers
 */
export function addCSRFToken(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFTokenForClient();
  
  if (token) {
    return {
      ...headers,
      [CSRF_CONFIG.headerName]: token,
    };
  }
  
  return headers;
}

/**
 * Utility to make a CSRF-protected fetch request
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = addCSRFToken(options.headers);
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Include cookies
  });
}

export default {
  generateCSRFToken,
  signCSRFToken,
  verifyCSRFToken,
  validateCSRFToken,
  csrfProtectionMiddleware,
  getCSRFTokenForClient,
  addCSRFToken,
  csrfFetch,
};
