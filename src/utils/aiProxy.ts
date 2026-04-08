import { supabase } from '../config/supabase';

/**
 * Calls the `ai-proxy` Supabase Edge Function.
 *
 * The Supabase client automatically attaches the authenticated user's JWT as
 * the Authorization header, so the Edge Function can validate the caller.
 * The Gemini API key never leaves the server.
 *
 * @param type  - Which AI operation to perform.
 * @param payload - The data required for that operation.
 * @returns The raw Gemini API response JSON.
 */
export const callAiProxy = async (
    type: 'parse-pdf' | 'generate-recipe' | 'sanitize-titles' | 'scan-receipt',
    payload: Record<string, unknown>
): Promise<any> => {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { type, payload },
    });

    if (error) {
        throw new Error(`AI Proxy error [${type}]: ${error.message}`);
    }

    return data;
};
