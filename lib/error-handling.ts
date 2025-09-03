/**
 * Error Handling Utilities
 * Centralized error handling for the application
 */

import { FirebaseError } from "firebase/app";

export interface AppError {
  code: string;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
}

/**
 * Firebase error codes and their user-friendly messages
 */
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  
  // Firestore errors
  'firestore/permission-denied': 'You don\'t have permission to perform this action.',
  'firestore/unavailable': 'Service temporarily unavailable. Please try again.',
  'firestore/deadline-exceeded': 'Request timed out. Please try again.',
  'firestore/not-found': 'The requested document was not found.',
  'firestore/already-exists': 'This record already exists.',
  'firestore/resource-exhausted': 'Too many requests. Please try again later.',
  
  // Storage errors
  'storage/unauthorized': 'You don\'t have permission to access this file.',
  'storage/cancelled': 'File upload was cancelled.',
  'storage/unknown': 'An unknown error occurred during file upload.',
  'storage/object-not-found': 'The requested file was not found.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
};

/**
 * Convert Firebase errors to user-friendly messages
 */
export function getFirebaseErrorMessage(error: FirebaseError): string {
  const userMessage = FIREBASE_ERROR_MESSAGES[error.code];
  
  if (userMessage) {
    return userMessage;
  }
  
  // Fallback for unmapped errors
  if (error.code.startsWith('auth/')) {
    return 'Authentication error. Please try again.';
  }
  
  if (error.code.startsWith('firestore/')) {
    return 'Database error. Please try again.';
  }
  
  if (error.code.startsWith('storage/')) {
    return 'File operation failed. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Create a standardized app error
 */
export function createAppError(
  code: string,
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return {
    code,
    message,
    originalError,
    context
  };
}

/**
 * Handle and normalize errors from various sources
 */
export function handleError(error: unknown, context?: string): AppError {
  // Firebase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as FirebaseError;
    return createAppError(
      firebaseError.code,
      getFirebaseErrorMessage(firebaseError),
      firebaseError,
      { context }
    );
  }
  
  // Standard JavaScript errors
  if (error instanceof Error) {
    return createAppError(
      'app/unknown-error',
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred. Please try again.'
        : error.message,
      error,
      { context }
    );
  }
  
  // String errors
  if (typeof error === 'string') {
    return createAppError(
      'app/unknown-error',
      error,
      undefined,
      { context }
    );
  }
  
  // Unknown error types
  return createAppError(
    'app/unknown-error',
    'An unexpected error occurred. Please try again.',
    undefined,
    { context, originalError: error }
  );
}

/**
 * Log errors (in production, this should integrate with your monitoring service)
 */
export function logError(error: AppError): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('Application Error:', {
      code: error.code,
      message: error.message,
      context: error.context,
      originalError: error.originalError
    });
  }
  
  // In production, send to monitoring service (Sentry, LogRocket, etc.)
  // Example:
  // if (window.Sentry) {
  //   window.Sentry.captureException(error.originalError || new Error(error.message), {
  //     tags: { code: error.code },
  //     extra: error.context
  //   });
  // }
}

/**
 * Network error detection
 */
export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    return (
      errorObj.code === 'auth/network-request-failed' ||
      errorObj.code === 'firestore/unavailable' ||
      errorObj.code === 'unavailable' ||
      errorObj.message?.includes('network') ||
      errorObj.message?.includes('offline')
    );
  }
  return false;
}

/**
 * Permission error detection
 */
export function isPermissionError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    return (
      errorObj.code === 'firestore/permission-denied' ||
      errorObj.code === 'storage/unauthorized' ||
      errorObj.code === 'auth/unauthorized'
    );
  }
  return false;
}

/**
 * Retry-able error detection
 */
export function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    return (
      errorObj.code === 'firestore/unavailable' ||
      errorObj.code === 'firestore/deadline-exceeded' ||
      errorObj.code === 'auth/network-request-failed' ||
      isNetworkError(error)
    );
  }
  return false;
}

/**
 * Error boundary utility for React components
 */
export class ErrorBoundaryError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'ErrorBoundaryError';
    this.code = appError.code;
    this.context = appError.context;
  }
}
