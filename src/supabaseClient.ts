/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhvbnfpzykdokqcnljth.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odmJuZnB6eWtkb2txY25sanRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDYxODUsImV4cCI6MjA4MzE4MjE4NX0.BYzfvjZlE2ppW7JKC8yU-WrG4m8gfDprIonU96XK59U'

// Debug fetch wrapper to find which header has "Invalid value"
const debugFetch: typeof fetch = async (input, init) => {
  if (init?.headers) {
    const h = new Headers(init.headers as HeadersInit)
    const headerEntries: [string, string][] = []
    h.forEach((v, k) => headerEntries.push([k, v]))
    for (const [name, value] of headerEntries) {
      try {
        new Headers({ [name]: value })
      } catch (e) {
        console.error(`[DEBUG] Invalid header: "${name}" = "${value.substring(0, 50)}..." (length: ${value.length})`)
        // Check for bad characters
        for (let i = 0; i < value.length; i++) {
          const code = value.charCodeAt(i)
          if (code < 0x20 || code > 0x7e) {
            console.error(`[DEBUG] Bad char at index ${i}: charCode=${code} char="${value[i]}"`)
          }
        }
      }
    }
    console.log('[DEBUG] Fetch URL:', typeof input === 'string' ? input : (input as Request).url)
    console.log('[DEBUG] Headers:', Object.fromEntries(headerEntries.map(([k, v]) => [k, v.substring(0, 30) + '...'])))
  }
  return fetch(input, init)
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
  },
  global: {
    fetch: debugFetch
  }
})
