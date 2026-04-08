import { cleanForShoppingList } from './stringUtils';

// 🟢 THE MASTER AGGREGATOR
export const groceryService = {
    generateSmartList: (input: any[] | Record<string, any>) => {
        if (!input) return {};

        const ingredientSet = new Set<string>();
        let allDishes: any[] = [];

        // 1. FLATTEN INPUT
        if (Array.isArray(input)) {
            // Legacy/Single-day Support
            allDishes = input.map(m => m.dish || m);
        } else {
            // JSONB Weekly Support
            Object.values(input).forEach((dayPlan: any) => {
                if (dayPlan && typeof dayPlan === 'object') {
                    Object.values(dayPlan).forEach((dish: any) => {
                        if (dish) allDishes.push(dish);
                    });
                }
            });
        }

        // 2. EXTRACT & CLEAN
        allDishes.forEach(dish => {
            // If the old format nested things under `.recipe`, unwrap it just in case
            const actualDish = dish?.recipe || dish;
            let ingredients = actualDish?.ingredients || actualDish?.ingredientLines || [];

            // If Supabase returned a stringified JSON array (common with RN Postgres text columns)
            if (typeof ingredients === 'string') {
                try {
                    ingredients = JSON.parse(ingredients);
                } catch (e) {
                    ingredients = [];
                }
            }

            if (!Array.isArray(ingredients)) return;

            ingredients.forEach((rawIng: any) => {
                // Support both new DB strings and leftover Edamam `{text: ...}` objects
                const textToClean = typeof rawIng === 'string' ? rawIng : (rawIng?.text || '');
                if (!textToClean) return;

                const cleanName = cleanForShoppingList(textToClean);
                if (cleanName) ingredientSet.add(cleanName);
            });
        });

        // 🟢 3. SORT INTO SIMPLE AISLES
        const groupedList: Record<string, any[]> = {};
        Array.from(ingredientSet).sort().forEach(name => {
            const cleanName = name.toLowerCase();
            let aisle = '🛒 Grocery';

            if (/(milk|cheese|egg|butter|yogurt)/i.test(cleanName)) aisle = '🥛 Dairy';
            if (/(onion|garlic|tomato|potato|pepper|apple|lemon|spinach|cilantro)/i.test(cleanName)) aisle = '🥦 Produce';
            if (/(chicken|beef|pork|bacon|fish)/i.test(cleanName)) aisle = '🥩 Meat';
            if (/(rice|pasta|flour|sauce|bean|lentil)/i.test(cleanName)) aisle = '🥫 Pantry';

            if (!groupedList[aisle]) groupedList[aisle] = [];
            groupedList[aisle].push({
                name: name,
                uniqueKey: name.replace(/\s+/g, '-')
            });
        });

        return groupedList;
    }
};
