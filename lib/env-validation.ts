/**
 * Environment Configuration Validator
 * Helps debug environment variable issues
 */

export interface EnvValidationResult {
  isValid: boolean
  missingVars: string[]
  loadedVars: Record<string, boolean>
  errors: string[]
}

/**
 * Validate Firebase environment variables
 */
export function validateFirebaseEnv(): EnvValidationResult {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ]

  const missingVars: string[] = []
  const loadedVars: Record<string, boolean> = {}
  const errors: string[] = []

  for (const varName of requiredVars) {
    const value = process.env[varName]
    const isLoaded = Boolean(value && value.trim() !== '')
    
    loadedVars[varName] = isLoaded
    
    if (!isLoaded) {
      missingVars.push(varName)
    }
  }

  // Additional validation
  if (missingVars.length > 0) {
    errors.push(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  // Check for common issues
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (apiKey && !apiKey.startsWith('AIza')) {
    errors.push('NEXT_PUBLIC_FIREBASE_API_KEY should start with "AIza"')
  }

  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  if (authDomain && !authDomain.includes('.firebaseapp.com')) {
    errors.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN should end with ".firebaseapp.com"')
  }

  return {
    isValid: missingVars.length === 0 && errors.length === 0,
    missingVars,
    loadedVars,
    errors
  }
}

/**
 * Validate Firebase Admin environment variables
 */
export function validateFirebaseAdminEnv(): EnvValidationResult {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ]

  const missingVars: string[] = []
  const loadedVars: Record<string, boolean> = {}
  const errors: string[] = []

  for (const varName of requiredVars) {
    const value = process.env[varName]
    const isLoaded = Boolean(value && value.trim() !== '')
    
    loadedVars[varName] = isLoaded
    
    if (!isLoaded) {
      missingVars.push(varName)
    }
  }

  // Additional validation for admin variables
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (privateKey && !privateKey.includes('BEGIN PRIVATE KEY')) {
    errors.push('FIREBASE_PRIVATE_KEY should contain a valid private key')
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  if (clientEmail && !clientEmail.includes('iam.gserviceaccount.com')) {
    errors.push('FIREBASE_CLIENT_EMAIL should be a service account email')
  }

  return {
    isValid: missingVars.length === 0 && errors.length === 0,
    missingVars,
    loadedVars,
    errors
  }
}

/**
 * Print environment validation results to console
 */
export function logEnvValidation(): void {
  console.log('🔍 Environment Validation Results:')
  
  const clientValidation = validateFirebaseEnv()
  console.log('\n📱 Firebase Client Configuration:')
  console.log('  Status:', clientValidation.isValid ? '✅ Valid' : '❌ Invalid')
  
  if (!clientValidation.isValid) {
    console.log('  Missing variables:', clientValidation.missingVars)
    console.log('  Errors:', clientValidation.errors)
  }
  
  console.log('  Loaded variables:')
  Object.entries(clientValidation.loadedVars).forEach(([key, loaded]) => {
    console.log(`    ${key}: ${loaded ? '✅' : '❌'}`)
  })

  // Only check admin env in server context
  if (typeof window === 'undefined') {
    const adminValidation = validateFirebaseAdminEnv()
    console.log('\n🔧 Firebase Admin Configuration:')
    console.log('  Status:', adminValidation.isValid ? '✅ Valid' : '❌ Invalid')
    
    if (!adminValidation.isValid) {
      console.log('  Missing variables:', adminValidation.missingVars)
      console.log('  Errors:', adminValidation.errors)
    }
    
    console.log('  Loaded variables:')
    Object.entries(adminValidation.loadedVars).forEach(([key, loaded]) => {
      console.log(`    ${key}: ${loaded ? '✅' : '❌'}`)
    })
  }
}
