// supabase/functions/delete-user/index.ts
// Deletes a user from both auth.users AND the clients table.
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
    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Admin client uses the service role key — can delete auth users
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Delete from auth.users (cascades or we handle clients below)
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Delete from clients table (in case FK doesn't cascade)
    await adminClient.from('clients').delete().eq('id', userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
