/**
 * ============================================================
 * LEGACY DIRECT-GEMINI CALL ARCHIVE
 * ============================================================
 *
 * This file is a READ-ONLY reference archive. It is NOT imported
 * anywhere in the application and has no effect at runtime.
 *
 * PURPOSE:
 *   These code blocks were the original implementations that called
 *   the Gemini API directly from the client app using the
 *   EXPO_PUBLIC_GEMINI_API_KEY environment variable. This meant the
 *   API key was baked into the JavaScript bundle at build time and
 *   was visible to anyone who decompiled the app binary.
 *
 * WHY THEY WERE REPLACED:
 *   All three blocks were swapped out for `callAiProxy(type, payload)`
 *   calls (see src/utils/aiProxy.ts). The proxy routes every Gemini
 *   request through a Supabase Edge Function (supabase/functions/ai-proxy/)
 *   that holds the real key as a server-side secret. The key never
 *   reaches the client bundle.
 *
 * DATE REMOVED: April 2026
 * REPLACED BY:  src/utils/aiProxy.ts + supabase/functions/ai-proxy/index.ts
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 — src/utils/aiService.ts → extractCourseFromPDF()
// ─────────────────────────────────────────────────────────────────────────────
//
// Original import (top of file):
//   import { GEMINI_CONFIG } from '../config/gemini';
//
// GEMINI_CONFIG resolved to:
//   {
//     API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',   ← exposed in bundle
//     MODEL_ID: 'gemini-2.0-flash',
//     API_URL: 'https://generativelanguage.googleapis.com/v1beta/models'
//   }
//
// This block was the entire Gemini REST call that lived at step 3 of
// extractCourseFromPDF(), immediately after the prompt string was built.
// It sent the base64-encoded PDF and the extraction prompt directly from
// the device to the Gemini API.
//
// REPLACED BY (one line):
//   const result = await callAiProxy('parse-pdf', { base64, prompt });
//
/*
        // 3. Call Gemini API  ← LEGACY — DO NOT RESTORE
        const response = await fetch(
            `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL_ID}:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: 'application/pdf',
                                        data: base64,
                                    },
                                },
                            ],
                        },
                    ],
                }),
            }
        );

        const result = await response.json();

        if (result.error) {
            console.error('Gemini API Error:', result.error);
            // throw new Error(result.error.message); // Don't throw, just return null so app doesn't crash
            return null;
        }
*/


// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 — src/utils/aiChefService.ts → generateInstructions()
// ─────────────────────────────────────────────────────────────────────────────
//
// Original imports (top of file):
//   import { GoogleGenerativeAI } from '@google/generative-ai';
//   import { GEMINI_CONFIG } from '../config/gemini';
//
// This block ran on every cache miss in generateInstructions(). It
// instantiated the Google Generative AI SDK client directly in the app,
// using the API key from the environment variable. The compiled SDK
// and the key both ended up inside the app bundle.
//
// The model used was 'gemini-2.0-flash' via the @google/generative-ai SDK
// (higher-level wrapper over the same REST API).
//
// REPLACED BY (three lines):
//   const result = await callAiProxy('generate-recipe', { prompt });
//   const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
//   const parsedInstructions = JSON.parse(responseText);
//
/*
            // CACHE MISS: CALL THE AI (Gemini)  ← LEGACY — DO NOT RESTORE
            const apiKey = GEMINI_CONFIG.API_KEY;
            if (!apiKey) throw new Error("Missing Gemini API Key");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: GEMINI_CONFIG.MODEL_ID || "gemini-2.0-flash",
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const parsedInstructions = JSON.parse(responseText);
*/


// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 — src/utils/aiChefService.ts → sanitizeMenuTitles()
// ─────────────────────────────────────────────────────────────────────────────
//
// Same pattern as Block 2 but used the 'gemini-2.5-flash' model for higher
// accuracy on the menu title cleaning task. The entire SDK client was
// re-instantiated on every call since there was no module-level singleton.
//
// REPLACED BY (three lines):
//   const result = await callAiProxy('sanitize-titles', { prompt });
//   const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
//   return JSON.parse(responseText);
//
/*
            // ← LEGACY — DO NOT RESTORE
            const apiKey = GEMINI_CONFIG.API_KEY;
            if (!apiKey) throw new Error("Missing Gemini API Key");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",          // ← different model vs Block 2
                generationConfig: { responseMimeType: "application/json" }
            });

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            return JSON.parse(responseText);
*/


// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 — src/services/expenseService.ts → processReceipt()
// ─────────────────────────────────────────────────────────────────────────────
//
// This block was the receipt OCR pipeline. Unlike Blocks 2 & 3 (which used
// the @google/generative-ai SDK), this one made a raw REST fetch() directly
// to the Gemini API endpoint. It constructed the URL by interpolating the
// API key directly into the query string.
//
// The `EXPO_PUBLIC_GEMINI_API_KEY` reference used process.env directly
// (not via GEMINI_CONFIG), which means it was the most direct form of
// client-side key exposure.
//
// The RECEIPT-GPT prompt that built the `prompt` variable is still intact
// and unchanged inside processReceipt() — only the transport layer changed.
//
// REPLACED BY (two lines):
//   const data = await callAiProxy('scan-receipt', { base64Image, prompt });
//   const textJSON = data.candidates?.[0]?.content?.parts?.[0]?.text;
//
/*
            // ← LEGACY — DO NOT RESTORE
            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY in environment");

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            // ... (prompt string built here — unchanged, still in processReceipt())

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error("Gemini API Error: " + err);
            }

            const data = await response.json();
            const textJSON = data.candidates?.[0]?.content?.parts?.[0]?.text;
*/


// ─────────────────────────────────────────────────────────────────────────────
// HOW THE NEW SYSTEM WORKS (for comparison)
// ─────────────────────────────────────────────────────────────────────────────
//
//  CLIENT (React Native app)
//    │
//    │  callAiProxy(type, payload)           ← src/utils/aiProxy.ts
//    │  └─ supabase.functions.invoke(        ← uses user's JWT for auth
//    │         'ai-proxy',
//    │         { body: { type, payload } }
//    │     )
//    │
//    ▼  HTTPS (authenticated via JWT, key is NEVER in this request)
//
//  SUPABASE EDGE FUNCTION (Deno runtime, server-side)
//    │  supabase/functions/ai-proxy/index.ts
//    │  └─ validates JWT Authorization header
//    │  └─ reads GEMINI_API_KEY from Deno.env (Supabase secret, never exposed)
//    │  └─ routes `type` to correct Gemini request shape
//    │
//    ▼  HTTPS to Gemini
//
//  GEMINI API
//    └─ returns candidates[0].content.parts[0].text (JSON string)
//    └─ Edge Function returns it verbatim to the client
//
// The response shape from callAiProxy() is IDENTICAL to what the old direct
// fetch() returned, so all downstream parsing code (JSON.parse, .candidates[],
// is_receipt gate, etc.) is completely unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export {}; // Keeps TypeScript happy — this file is a module, not a script.
