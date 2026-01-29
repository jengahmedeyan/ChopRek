/**
 * React Hook for CSRF Protection
 * 
 * Provides easy-to-use CSRF token management for client-side requests
 */

'use client';

import { useEffect, useState } from 'react';
import { getCSRFTokenForClient, addCSRFToken } from '@/lib/csrf-protection';

/**
 * Hook to get CSRF token for manual requests
 * 
 * @example
 * const csrfToken = useCSRFToken();
 * 
 * fetch('/api/orders', {
 *   method: 'POST',
 *   headers: {
 *     'x-csrf-token': csrfToken,
 *   },
 * });
 */
export function useCSRFToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from cookie
    const currentToken = getCSRFTokenForClient();
    setToken(currentToken);

    // If no token, trigger a GET request to get one
    if (!currentToken) {
      fetch(window.location.href, { method: 'GET' })
        .then(() => {
          const newToken = getCSRFTokenForClient();
          setToken(newToken);
        })
        .catch(error => {
          console.error('Failed to get CSRF token:', error);
        });
    }
  }, []);

  return token;
}

/**
 * Hook to create a fetch wrapper with automatic CSRF token
 * 
 * @example
 * const csrfFetch = useCSRFFetch();
 * 
 * const response = await csrfFetch('/api/orders', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 */
export function useCSRFFetch() {
  const token = useCSRFToken();

  return async (url: string, options: RequestInit = {}) => {
    const headers = addCSRFToken(options.headers);

    return fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  };
}

/**
 * Hook for form submissions with CSRF protection
 * 
 * @example
 * const handleSubmit = useCSRFFormSubmit(async (data) => {
 *   const response = await fetch('/api/orders', {
 *     method: 'POST',
 *     body: JSON.stringify(data),
 *   });
 *   return response.json();
 * });
 * 
 * <form onSubmit={handleSubmit}>...</form>
 */
export function useCSRFFormSubmit<T = any>(
  onSubmit: (data: any) => Promise<T>
) {
  const csrfFetch = useCSRFFetch();

  return async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const result = await onSubmit(data);
      return result;
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    }
  };
}

export default useCSRFToken;
