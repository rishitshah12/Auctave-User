/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhvbnfpzykdokqcnljth.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odmJuZnB6eWtkb2txY25sanRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDYxODUsImV4cCI6MjA4MzE4MjE4NX0.BYzfvjZlE2ppW7JKC8yU-WrG4m8gfDprIonU96XK59U'

// Safari private mode blocks localStorage — fall back to in-memory storage
function safeStorage(): Storage | undefined {
  try {
    localStorage.setItem('__test__', '1')
    localStorage.removeItem('__test__')
    return localStorage
  } catch {
    const mem: Record<string, string> = {}
    return {
      getItem: (k) => mem[k] ?? null,
      setItem: (k, v) => { mem[k] = v },
      removeItem: (k) => { delete mem[k] },
      clear: () => { Object.keys(mem).forEach(k => delete mem[k]) },
      key: (i) => Object.keys(mem)[i] ?? null,
      get length() { return Object.keys(mem).length },
    } as Storage
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: safeStorage(),
  }
})
