import { callAiProxy } from './aiProxy';
import { supabase } from '../config/supabase';

export const aiChefService = {
    // 🟢 Notice we added recipeId to the parameters!
    generateInstructions: async (recipeId: string, recipeTitle: string, ingredients: any[]) => {
        try {
            // ---------------------------------------------------------
            // 🟢 1. CHECK THE GLOBAL CACHE FIRST
            // ---------------------------------------------------------
            const { data: cachedRecipe } = await supabase
                .from('global_recipe_cache')
                .select('instructions')
                .eq('recipe_id', recipeId)
                .maybeSingle();

            if (cachedRecipe && cachedRecipe.instructions) {
                return cachedRecipe.instructions;
            }

            // ---------------------------------------------------------
            // CACHE MISS: CALL THE AI via proxy (key stays server-side)
            // ---------------------------------------------------------
            const ingredientList = ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`).join(', ');
            const prompt = `
            You are an expert culinary AI for a university student app. 
            The student is making: "${recipeTitle}".
            They have these ingredients: ${ingredientList}.

            Write a simple, step-by-step cooking guide. 
            
            Crucially, suggest the absolute perfect, traditional culinary pairing (the "soulmate" dish, side, or drink) to complete this specific meal. 
            - You MUST suggest iconic, culturally accurate combinations. 
            - EXAMPLES: If the dish is 'Jeera Rice', suggest 'Dal Fry or Dal Makhani'. If it is 'Palak Paneer' or 'Butter Chicken', suggest 'Garlic Naan or Tandoori Roti'. If it is 'Masala Dosa' or 'Idli', suggest 'Sambar and Coconut Chutney'. If it is 'Poha' or 'Upma', suggest 'a hot cup of Masala Chai'.
            - If it is a Western dish like Pasta, suggest 'Garlic Bread or a side salad'. 
            - Keep the suggestion brief, appetizing, and realistic for a student to quickly add or prepare.

            You MUST respond with ONLY a valid JSON object matching this exact schema:
            {
              "prepTime": "String (e.g., '5 mins')",
              "cookTime": "String (e.g., '15 mins')",
              "pairingSuggestion": "String (e.g., 'Perfectly paired with classic Dal Fry and a side of roasted papad!')",
              "steps": ["Step 1", "Step 2", "Step 3"]
            }
            `;

            const result = await callAiProxy('generate-recipe', { prompt });
            const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) throw new Error('No response from AI proxy');
            const parsedInstructions = JSON.parse(responseText);

            // ---------------------------------------------------------
            // 🟢 3. SAVE TO GLOBAL CACHE FOR THE NEXT USER
            // ---------------------------------------------------------
            const { error: insertError } = await supabase
                .from('global_recipe_cache')
                .upsert({
                    recipe_id: recipeId,
                    instructions: parsedInstructions
                }, { onConflict: 'recipe_id' });

            if (insertError) {
                console.error("Failed to save to global cache:", insertError);
            }

            return parsedInstructions;

        } catch (error) {
            console.error("AI Chef Generation Error:", error);
            // Fallback
            return {
                prepTime: "5 mins",
                cookTime: "15 mins",
                pairingSuggestion: "Water always works!",
                steps: ["Gather ingredients.", "Follow standard cooking methods.", "Serve and enjoy!"]
            };
        }
    },

    // 🟢 CONTEXT-AWARE TITLE SANITIZER
    sanitizeMenuTitles: async (dirtyItemsMap: Record<string, { title: string, ingredients: string }>) => {
        try {
            const prompt = `
            You are a professional restaurant menu editor. 
            I am giving you a JSON object containing web-scraped recipe data. 
            
            Your job is to strip ALL blogger fluff and leave ONLY the professional, core name of the dish.
            
            🚨 CRITICAL RULE FOR MISLEADING NAMES: I am also providing a short list of the actual ingredients. If the original title contains a meat word (like "Chicken") but the ingredients prove it is vegetarian (e.g., it only contains yogurt, onions, and spices), you MUST rename the dish based ONLY on the actual ingredients provided (e.g., "Spiced Yogurt Curry"). Do not hallucinate ingredients like "soya" or "paneer" unless they are in the ingredient list.

            Here is the dirty data:
            ${JSON.stringify(dirtyItemsMap)}

            You MUST respond with a valid JSON object using the EXACT SAME KEYS I provided, but with the completely cleaned and accurate titles as the ONLY values. (e.g., { "Monday_Dinner": "Spiced Yogurt Curry" })
            `;

            const result = await callAiProxy('sanitize-titles', { prompt });
            const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) throw new Error('No response from AI proxy');

            return JSON.parse(responseText);

        } catch (error) {
            console.error("AI Title Sanitizer Error:", error);
            // Fallback: return the original titles if the AI fails
            const fallbackMap: Record<string, string> = {};
            for (const key in dirtyItemsMap) {
                fallbackMap[key] = dirtyItemsMap[key].title;
            }
            return fallbackMap;
        }
    }
};
