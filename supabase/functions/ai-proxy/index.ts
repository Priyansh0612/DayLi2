// @ts-nocheck — This file runs in Deno on Supabase Edge Functions, not in the RN bundle.
// The local TypeScript server doesn't have Deno types; these errors are expected and harmless.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

Deno.serve(async (req: Request) => {
  // ── Auth Guard ──────────────────────────────────────────────────────────────
  // The Supabase client SDK attaches the user's JWT automatically, so if this
  // header is missing the caller is unauthenticated.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured: missing GEMINI_API_KEY secret" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Parse request body ───────────────────────────────────────────────────────
  let body: { type: string; payload: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { type, payload } = body;

  // ── Build the Gemini request based on type ───────────────────────────────────
  let model = "gemini-2.0-flash";
  let geminiBody: Record<string, unknown>;

  if (type === "parse-pdf") {
    // aiService.ts → extractCourseFromPDF()
    // payload: { base64: string, prompt: string }
    geminiBody = {
      contents: [
        {
          parts: [
            { text: payload.prompt },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: payload.base64,
              },
            },
          ],
        },
      ],
    };
  } else if (type === "generate-recipe") {
    // aiChefService.ts → generateInstructions()
    // payload: { prompt: string }
    geminiBody = {
      contents: [{ parts: [{ text: payload.prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };
  } else if (type === "sanitize-titles") {
    // aiChefService.ts → sanitizeMenuTitles()
    // Uses gemini-2.5-flash for higher accuracy on title cleaning
    model = "gemini-2.5-flash";
    geminiBody = {
      contents: [{ parts: [{ text: payload.prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };
  } else if (type === "scan-receipt") {
    // expenseService.ts → processReceipt()
    // payload: { base64Image: string, prompt: string }
    geminiBody = {
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: payload.base64Image } },
            { text: payload.prompt },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    };
  } else {
    return new Response(JSON.stringify({ error: `Unknown proxy type: ${type}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Forward to Gemini ─────────────────────────────────────────────────────────
  const geminiUrl = `${GEMINI_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const geminiResponse = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  });

  const responseData = await geminiResponse.json();

  return new Response(JSON.stringify(responseData), {
    status: geminiResponse.status,
    headers: { "Content-Type": "application/json" },
  });
});
