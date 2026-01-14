// Environment variable validation
// Call this on app startup to ensure all required env vars are set

export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GROQ_API_KEY',
  ];

  const optional = [
    'GOOGLE_GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file.`
    );
  }

  // Warn about optional keys (only in development)
  if (process.env.NODE_ENV === 'development') {
    const missingOptional = optional.filter(key => !process.env[key]);
    if (missingOptional.length > 0) {
      console.warn(
        `Missing optional environment variables: ${missingOptional.join(', ')}\n` +
        `Some features may not work without these.`
      );
    }
  }
}

// Security checks
export function validateApiKeys() {
  // Check if Supabase keys look valid
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Security checks (only in development)
  if (process.env.NODE_ENV === 'development') {
    if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
      console.warn('Supabase URL does not look valid');
    }

    if (supabaseKey && supabaseKey.length < 100) {
      console.warn('Supabase anon key seems too short');
    }

    // Check if using placeholder/example values
    const dangerousValues = ['your-api-key', 'placeholder', 'example', 'test'];
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.includes('API_KEY') && typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (dangerousValues.some(dangerous => lowerValue.includes(dangerous))) {
          console.error(`${key} contains a placeholder value! Please update it.`);
        }
      }
    }
  }
}
