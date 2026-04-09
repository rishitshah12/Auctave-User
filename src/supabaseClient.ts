/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhvbnfpzykdokqcnljth.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odmJuZnB6eWtkb2txY25sanRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDYxODUsImV4cCI6MjA4MzE4MjE4NX0.BYzfvjZlE2ppW7JKC8yU-WrG4m8gfDprIonU96XK59U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})
