/**
 * 🏛️ UNIVERSAL STRING UTILS — SUPERMASTER EDITION
 * A scaling-proof suite for cleaning student meal data.
 */

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const FOOD_ANCHORS = new Set([
    'rice', 'flour', 'bean', 'lentil', 'oil', 'sauce', 'cheese',
    'milk', 'yogurt', 'chicken', 'beef', 'pork', 'tortilla', 'chip',
    'salsa', 'honey', 'sugar', 'salt', 'pasta', 'bread', 'butter', 'egg',
    'onion', 'garlic', 'tomato', 'potato', 'pepper', 'apple', 'lemon', 'spinach',
    'cilantro', 'lime', 'ginger', 'cumin', 'turmeric', 'curry', 'chili',
    'avocado', 'zucchini', 'tofu', 'mushroom', 'carrot', 'celery', 'cabbage',
    'broccoli', 'cauliflower', 'peanut', 'cashew', 'almond', 'walnut', 'oat',
    'quinoa', 'barley', 'corn', 'coconut', 'cream', 'vinegar', 'mustard',
    'mayo', 'ketchup', 'soy', 'miso', 'tahini', 'hummus', 'topping', 'dressing',
    'paneer', 'besan', 'pumpkin', 'seed', 'raisin', 'chickpea'
]);

const FOOD_ADJECTIVES = new Set([
    'brown', 'white', 'black', 'red', 'shredded', 'refried', 'chickpea',
    'whole', 'green', 'yellow', 'sweet', 'wild', 'basmati', 'jasmine',
    'long', 'short', 'grain', 'baby', 'cherry', 'grape', 'roma', 'plum',
    'russet', 'purple', 'dark', 'light', 'unsalted', 'salted', 'raw', 'roasted'
]);

const FLUFF_WORDS = [
    'store brand', 'generic', 'organic', 'extra virgin', 'all purpose',
    'approx', 'approximately', 'roughly', 'finely', 'chopped', 'diced',
    'minced', 'freshly', 'ground', 'dried', 'large', 'small', 'medium',
    'cloves of', 'no name', 'great value', 'compliments', 'selection',
    'pc', 'presidents choice', 'kirkland', 'kraft', 'haldiram',
    'premium', 'natural', 'pure', 'fresh', 'home style', 'traditional',
    'classic', 'original', 'regular', 'lite', 'low fat', 'fat free',
    'reduced fat', 'low sodium', 'unsweetened', 'enriched', 'fortified',
    'to', 'or', 'and', 'of', 'for', 'with', 'taste'
];

const MEASUREMENTS = /\b(?:\d*\.?\d+\s+)?(cup|cups|tbsp|tsp|tablespoon|teaspoon|gram|g|ml|milliliter|oz|ounce|lb|pound|pkg|package|can|jar|bag|bottle|slice|slices|clove|cloves|pinch|dash|handful|piece|pieces|serving|servings|bunch|head|stalk|stalks|strip|strips|block|sheet|sheets)s?\b/gi;

const NULL_ITEMS = new Set([
    'water', 'ice', 'salt', 'pepper', 'cooking oil', 'oil', 'nonstick spray',
    'cooking spray', 'to taste', 'as needed', 'as desired'
]);

/**
 * Alias map — plurals and common variants → canonical singular form.
 * Sorted alphabetically for easy maintenance.
 */
const ALIAS_MAP: Record<string, string> = {
    almonds: 'almond',
    apples: 'apple',
    avocados: 'avocado',
    beans: 'bean',
    berries: 'berry',
    broccolis: 'broccoli',
    carrots: 'carrot',
    cashews: 'cashew',
    chiles: 'chili',
    chilies: 'chili',
    chips: 'chip',
    cloves: 'clove',
    corns: 'corn',
    eggs: 'egg',
    garlic: 'garlic',
    lemons: 'lemon',
    lentils: 'lentil',
    limes: 'lime',
    leaves: 'leaf',
    mushrooms: 'mushroom',
    oats: 'oat',
    olives: 'olive',
    onions: 'onion',
    oranges: 'orange',
    paneers: 'paneer',
    panner: 'paneer',
    panners: 'paneer',
    peanuts: 'peanut',
    peppers: 'pepper',
    potatoes: 'potato',
    pumpkins: 'pumpkin',
    raisins: 'raisin',
    seeds: 'seed',
    tomatoes: 'tomato',
    walnuts: 'walnut',
    zucchinis: 'zucchini',
    zucchini: 'zucchini',
};

// Trailing garbage: "and", "or", lone conjunctions/punctuation at end of string
const TRAILING_NOISE = /[\s,&+]+(?:and|or|etc|plus|with|&|\+|,|\.)+[\s,&+]*$/i;

// Leading noise
const LEADING_NOISE = /^[\s,&+\-–—:;]+/;

// Repeated word: "peanut peanut" or "cashew cashew butter"
const DUPLICATE_WORDS = /\b(\w+)\s+\1\b/gi;

// ─── SHARED UTILITIES ─────────────────────────────────────────────────────────

/**
 * Strips parenthetical notes, lowercases, and collapses whitespace.
 */
const normalizeRaw = (raw: string): string =>
    raw
        .replace(/\([^)]*\)/g, '')   // remove (parenthetical notes)
        .replace(/\[[^\]]*\]/g, '')  // remove [bracketed notes]
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Naive singularizer for words not in ALIAS_MAP.
 * Handles common English plural patterns.
 */
const naiveSingularize = (word: string): string => {
    if (ALIAS_MAP[word]) return ALIAS_MAP[word];
    if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
    if (word.endsWith('oes')) return word.slice(0, -2);
    if (word.endsWith('ses') || word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes')) {
        return word.slice(0, -2);
    }
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
    return word;
};

/**
 * Removes trailing/leading noise and deduplicates repeated words.
 */
const polishResult = (result: string): string =>
    result
        .replace(DUPLICATE_WORDS, '$1')     // "peanut peanut" → "peanut"
        .replace(TRAILING_NOISE, '')         // "...and" / "...or" at end
        .replace(LEADING_NOISE, '')          // leading punctuation
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Capitalizes the first letter of a string.
 */
const capitalize = (s: string): string =>
    s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);

// ─── MODE A: SHOPPING LIST ────────────────────────────────────────────────────

/**
 * 🟢 MODE A: Shopping List
 * Strips quantities, units, and brand noise — returns a clean canonical
 * ingredient name suitable for a deduplicated shopping list.
 */
export const cleanForShoppingList = (raw: string): string | null => {
    if (!raw?.trim()) return null;

    // 1. Normalize brackets + case + whitespace
    let clean = normalizeRaw(raw);

    // 2. Strip measurements BEFORE alias expansion (so "cloves" → "clove" first)
    clean = clean.replace(MEASUREMENTS, ' ');

    // 3. Strip stray numbers and unicode fractions
    clean = clean.replace(/[0-9\/\.¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\-]+/g, ' ');

    // 4. Tokenise and singularize
    const words = clean
        .split(/[\s,&+]+/)
        .filter(w => w.length > 1)
        .map(naiveSingularize);

    // 5. Locate the first food anchor (exact match after normalization)
    const anchorIndex = words.findIndex(w => FOOD_ANCHORS.has(w));

    let result: string;

    if (anchorIndex !== -1) {
        const anchor = words[anchorIndex];
        const wordBefore = anchorIndex > 0 ? words[anchorIndex - 1] : undefined;

        // Carry one qualifying adjective if it's a known food adjective
        result = wordBefore && FOOD_ADJECTIVES.has(wordBefore)
            ? `${wordBefore} ${anchor}`
            : anchor;
    } else {
        // Fallback: remove fluff and return what remains
        const fluffPattern = new RegExp(
            `\\b(${FLUFF_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
            'gi'
        );
        result = words
            .filter(w => !fluffPattern.test(w))
            .join(' ');
    }

    // 6. Polish: deduplicate repeated words, strip trailing "and/or/etc"
    result = polishResult(result);

    // 7. Null-out basics
    if (NULL_ITEMS.has(result.toLowerCase())) return null;
    if (!result || result.trim().length < 2) return null;

    return capitalize(result);
};

// ─── MODE B: RECIPE DISPLAY ───────────────────────────────────────────────────

// Precompile fluff regex once (expensive to rebuild on every call)
const FLUFF_REGEX = new RegExp(
    `\\b(${FLUFF_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
);

/**
 * 🟢 MODE B: Recipe Display
 * Keeps quantities and units but scrubs brand names, filler adjectives,
 * and parenthetical noise. Also normalizes plurals.
 */
export const cleanForRecipe = (raw: string): string => {
    if (!raw?.trim()) return '';

    // 1. Bracket purge (keep case — recipe display preserves proper nouns)
    let clean = raw.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');

    // 2. Remove fluff
    clean = clean.replace(FLUFF_REGEX, '');

    // 3. Normalize plurals via alias map (word by word)
    clean = clean
        .split(/\s+/)
        .map(w => ALIAS_MAP[w.toLowerCase()] ?? w)
        .join(' ');

    // 4. Polish
    clean = polishResult(clean.replace(/\s+/g, ' ').trim());

    return capitalize(clean);
};
