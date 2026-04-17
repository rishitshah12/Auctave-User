// supabase/functions/manage-user/index.ts
// Suspends or unsuspends a user via Supabase Auth Admin API (ban_duration).
// Requires SUPABASE_SERVICE_ROLE_KEY set in Supabase project secrets.

declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, action } = await req.json(); // action: 'suspend' | 'unsuspend'
    if (!userId || !['suspend', 'unsuspend'].includes(action)) {
      return new Response(JSON.stringify({ error: 'userId and action (suspend|unsuspend) are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ban_duration: '876600h' ≈ 100 years. 'none' lifts the ban.
    const banDuration = action === 'suspend' ? '876600h' : 'none';
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: banDuration,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Mirror status in clients table for UI display
    const status = action === 'suspend' ? 'suspended' : 'active';
    await adminClient.from('clients').update({ status }).eq('id', userId);

    return new Response(JSON.stringify({ success: true, status }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
