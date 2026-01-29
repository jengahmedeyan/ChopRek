/**
 * API Key Rotation System
 * 
 * Provides secure API key generation, rotation, and management
 * for Firebase and other third-party services.
 */

import { randomBytes, createHash } from 'crypto';

// ===== TYPES =====

export interface APIKey {
  id: string;
  name: string;
  service: 'firebase' | 'email' | 'payment' | 'analytics' | 'other';
  key: string;
  createdAt: Date;
  expiresAt: Date;
  rotatedAt?: Date;
  isActive: boolean;
  lastUsed?: Date;
  usageCount: number;
  metadata?: Record<string, any>;
}

export interface KeyRotationPolicy {
  service: string;
  rotationIntervalDays: number;
  notifyBeforeDays: number;
  autoRotate: boolean;
  gracePeriodDays: number; // Keep old key active for transition
}

export interface RotationAlert {
  keyId: string;
  keyName: string;
  service: string;
  expiresAt: Date;
  daysUntilExpiry: number;
  severity: 'info' | 'warning' | 'critical';
}

// ===== CONFIGURATION =====

export const DEFAULT_ROTATION_POLICIES: Record<string, KeyRotationPolicy> = {
  firebase: {
    service: 'firebase',
    rotationIntervalDays: 90, // Rotate every 3 months
    notifyBeforeDays: 14, // Alert 2 weeks before
    autoRotate: false, // Manual rotation recommended
    gracePeriodDays: 7, // Keep old key for 1 week
  },
  email: {
    service: 'email',
    rotationIntervalDays: 180, // Rotate every 6 months
    notifyBeforeDays: 30,
    autoRotate: false,
    gracePeriodDays: 14,
  },
  payment: {
    service: 'payment',
    rotationIntervalDays: 60, // Rotate every 2 months (sensitive)
    notifyBeforeDays: 7,
    autoRotate: false,
    gracePeriodDays: 3,
  },
  analytics: {
    service: 'analytics',
    rotationIntervalDays: 365, // Rotate annually
    notifyBeforeDays: 30,
    autoRotate: true,
    gracePeriodDays: 30,
  },
};

// In-memory store (use database in production)
const apiKeyStore = new Map<string, APIKey>();
const rotationPolicies = new Map<string, KeyRotationPolicy>();

// Initialize with default policies
Object.values(DEFAULT_ROTATION_POLICIES).forEach(policy => {
  rotationPolicies.set(policy.service, policy);
});

// ===== KEY GENERATION =====

/**
 * Generate a secure random API key
 */
export function generateAPIKey(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Generate a hash of an API key (for storage)
 */
export function hashAPIKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a key ID
 */
export function generateKeyID(): string {
  return `key_${randomBytes(16).toString('hex')}`;
}

/**
 * Create a new API key
 */
export function createAPIKey(params: {
  name: string;
  service: APIKey['service'];
  customKey?: string;
  metadata?: Record<string, any>;
}): APIKey {
  const key = params.customKey || generateAPIKey();
  const policy = rotationPolicies.get(params.service) || DEFAULT_ROTATION_POLICIES.firebase;
  
  const apiKey: APIKey = {
    id: generateKeyID(),
    name: params.name,
    service: params.service,
    key: hashAPIKey(key), // Store hashed version
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + policy.rotationIntervalDays * 24 * 60 * 60 * 1000),
    isActive: true,
    usageCount: 0,
    metadata: params.metadata,
  };
  
  apiKeyStore.set(apiKey.id, apiKey);
  
  // Return the actual key (only time it's available in plain text)
  return {
    ...apiKey,
    key, // Plain text key (don't log this!)
  };
}

// ===== KEY ROTATION =====

/**
 * Rotate an API key (create new, mark old as expiring)
 */
export function rotateAPIKey(keyId: string): { newKey: APIKey; oldKey: APIKey } | null {
  const oldKey = apiKeyStore.get(keyId);
  if (!oldKey) {
    console.error(`Key not found: ${keyId}`);
    return null;
  }
  
  const policy = rotationPolicies.get(oldKey.service) || DEFAULT_ROTATION_POLICIES.firebase;
  
  // Create new key with same configuration
  const newKey = createAPIKey({
    name: oldKey.name,
    service: oldKey.service,
    metadata: { ...oldKey.metadata, rotatedFrom: keyId },
  });
  
  // Update old key with grace period
  const gracePeriodEnd = new Date(Date.now() + policy.gracePeriodDays * 24 * 60 * 60 * 1000);
  oldKey.expiresAt = gracePeriodEnd;
  oldKey.rotatedAt = new Date();
  oldKey.isActive = false;
  oldKey.metadata = { ...oldKey.metadata, rotatedTo: newKey.id };
  apiKeyStore.set(keyId, oldKey);
  
  console.log(`Key rotated: ${keyId} → ${newKey.id}`);
  console.log(`Old key will expire on: ${gracePeriodEnd.toISOString()}`);
  
  return { newKey, oldKey };
}

/**
 * Check if a key needs rotation
 */
export function needsRotation(keyId: string): boolean {
  const key = apiKeyStore.get(keyId);
  if (!key) return false;
  
  const policy = rotationPolicies.get(key.service);
  if (!policy) return false;
  
  const now = Date.now();
  const expiryTime = key.expiresAt.getTime();
  const notifyTime = expiryTime - (policy.notifyBeforeDays * 24 * 60 * 60 * 1000);
  
  return now >= notifyTime;
}

/**
 * Get all keys that need rotation
 */
export function getKeysNeedingRotation(): RotationAlert[] {
  const alerts: RotationAlert[] = [];
  const now = Date.now();
  
  for (const key of apiKeyStore.values()) {
    if (!key.isActive) continue;
    
    const policy = rotationPolicies.get(key.service);
    if (!policy) continue;
    
    const expiryTime = key.expiresAt.getTime();
    const daysUntilExpiry = Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000));
    
    if (daysUntilExpiry <= policy.notifyBeforeDays) {
      let severity: RotationAlert['severity'] = 'info';
      if (daysUntilExpiry <= 3) severity = 'critical';
      else if (daysUntilExpiry <= 7) severity = 'warning';
      
      alerts.push({
        keyId: key.id,
        keyName: key.name,
        service: key.service,
        expiresAt: key.expiresAt,
        daysUntilExpiry,
        severity,
      });
    }
  }
  
  return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

// ===== KEY VALIDATION =====

/**
 * Validate an API key
 */
export function validateAPIKey(keyId: string, providedKey: string): boolean {
  const storedKey = apiKeyStore.get(keyId);
  if (!storedKey) return false;
  
  // Check if key is active
  if (!storedKey.isActive) {
    console.warn(`Attempted to use inactive key: ${keyId}`);
    return false;
  }
  
  // Check if key is expired
  if (storedKey.expiresAt.getTime() < Date.now()) {
    console.warn(`Attempted to use expired key: ${keyId}`);
    storedKey.isActive = false;
    apiKeyStore.set(keyId, storedKey);
    return false;
  }
  
  // Validate key hash
  const providedHash = hashAPIKey(providedKey);
  if (storedKey.key !== providedHash) {
    console.warn(`Invalid key provided for: ${keyId}`);
    return false;
  }
  
  // Update usage statistics
  storedKey.lastUsed = new Date();
  storedKey.usageCount++;
  apiKeyStore.set(keyId, storedKey);
  
  return true;
}

/**
 * Revoke an API key immediately
 */
export function revokeAPIKey(keyId: string): boolean {
  const key = apiKeyStore.get(keyId);
  if (!key) return false;
  
  key.isActive = false;
  key.expiresAt = new Date(); // Expire immediately
  apiKeyStore.set(keyId, key);
  
  console.log(`Key revoked: ${keyId}`);
  return true;
}

// ===== MONITORING & REPORTING =====

/**
 * Get key usage statistics
 */
export function getKeyUsageStats(keyId: string): {
  key: APIKey;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
} | null {
  const key = apiKeyStore.get(keyId);
  if (!key) return null;
  
  const now = Date.now();
  const expiryTime = key.expiresAt.getTime();
  const daysUntilExpiry = Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000));
  
  const policy = rotationPolicies.get(key.service);
  const isExpiringSoon = policy ? daysUntilExpiry <= policy.notifyBeforeDays : false;
  
  return {
    key,
    daysUntilExpiry,
    isExpiringSoon,
  };
}

/**
 * Get all active keys
 */
export function getAllActiveKeys(): APIKey[] {
  return Array.from(apiKeyStore.values()).filter(key => key.isActive);
}

/**
 * Get keys by service
 */
export function getKeysByService(service: string): APIKey[] {
  return Array.from(apiKeyStore.values()).filter(key => 
    key.service === service && key.isActive
  );
}

// ===== POLICY MANAGEMENT =====

/**
 * Update rotation policy for a service
 */
export function updateRotationPolicy(policy: KeyRotationPolicy): void {
  rotationPolicies.set(policy.service, policy);
  console.log(`Updated rotation policy for: ${policy.service}`);
}

/**
 * Get rotation policy for a service
 */
export function getRotationPolicy(service: string): KeyRotationPolicy | null {
  return rotationPolicies.get(service) || null;
}

// ===== AUTOMATED ROTATION =====

/**
 * Run automated key rotation check
 * Should be called by a cron job or scheduled task
 */
export function runAutomatedRotation(): {
  rotated: string[];
  alerts: RotationAlert[];
} {
  const rotated: string[] = [];
  const alerts = getKeysNeedingRotation();
  
  for (const alert of alerts) {
    const policy = rotationPolicies.get(alert.service);
    
    if (policy?.autoRotate && alert.severity === 'critical') {
      const result = rotateAPIKey(alert.keyId);
      if (result) {
        rotated.push(alert.keyId);
        console.log(`Auto-rotated key: ${alert.keyName} (${alert.keyId})`);
      }
    }
  }
  
  return { rotated, alerts };
}

// ===== EXPORT =====

export default {
  generateAPIKey,
  hashAPIKey,
  createAPIKey,
  rotateAPIKey,
  validateAPIKey,
  revokeAPIKey,
  needsRotation,
  getKeysNeedingRotation,
  getKeyUsageStats,
  getAllActiveKeys,
  getKeysByService,
  updateRotationPolicy,
  getRotationPolicy,
  runAutomatedRotation,
};
