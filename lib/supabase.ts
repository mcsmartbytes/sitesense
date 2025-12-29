import { createClient } from '@supabase/supabase-js';

// These are the same credentials as the parent app (sealn-super-site)
// Used only for validating parent tokens during embedded mode
const supabaseUrl = process.env.NEXT_PUBLIC_PARENT_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_PARENT_SUPABASE_ANON_KEY || '';

// Create client only if env vars are available
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to get the client with error handling
export function getSupabase() {
  if (!supabase) {
    throw new Error(
      'Parent Supabase client not initialized. Set NEXT_PUBLIC_PARENT_SUPABASE_URL and NEXT_PUBLIC_PARENT_SUPABASE_ANON_KEY for embedded mode.'
    );
  }
  return supabase;
}

// Validate a parent app's access token and return user info
export async function validateParentToken(accessToken: string): Promise<{
  valid: boolean;
  email?: string;
  userId?: string;
  error?: string;
}> {
  if (!supabase) {
    return { valid: false, error: 'Parent Supabase not configured' };
  }

  try {
    // Use the access token to get the user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return { valid: false, error: error?.message || 'Invalid token' };
    }

    return {
      valid: true,
      email: user.email,
      userId: user.id,
    };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Token validation failed' };
  }
}
