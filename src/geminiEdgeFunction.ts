// IMPORTANT: This file should be placed in your Supabase project under:
// supabase/functions/gemini-api/index.ts
//
// You also need to set the GEMINI_API_KEY environment variable in your Supabase project settings.
// Do NOT prefix it with VITE_.

// Declare Deno to prevent TypeScript errors when editing inside a non-Deno project structure
declare const Deno: any;

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

Deno.serve(async (req) => {
  // This is needed to invoke the function from a browser client
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
  }

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Gemini API key not configured on the server." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    )
  }

  let prompt;
  try {
    const body = await req.json();
    prompt = body.prompt;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    )
  }

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: "No prompt provided." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    )
  }

  const payload = {
    contents: [{
        role: "user",
        parts: [{ text: prompt }]
    }]
  };

  try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        return new Response(
          JSON.stringify({ error: `API call failed with status ${response.status}: ${errorBody}` }),
          { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } },
        )
    }

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        return new Response(
          JSON.stringify({ text }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        )
    } else {
        console.error("Unexpected API response format:", result);
        return new Response(
          JSON.stringify({ error: "Unexpected API response format." }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
        )
    }
  } catch (error) {
      console.error("Error in Gemini Edge Function:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "An unknown error occurred" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      )
  }
})
