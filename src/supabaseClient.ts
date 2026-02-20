/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and/or Anon Key are missing from your .env.local file. Please add them.");
}

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('localStorage is not available:', e);
    return false;
  }
};

// Log storage availability
console.log('LocalStorage available:', isLocalStorageAvailable());

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: isLocalStorageAvailable() ? undefined : {
      getItem: (key) => {
        console.warn('Custom storage: getItem called for', key);
        return null;
      },
      setItem: (key, value) => {
        console.warn('Custom storage: setItem called for', key);
      },
      removeItem: (key) => {
        console.warn('Custom storage: removeItem called for', key);
      }
    }
  }
})