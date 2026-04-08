import { supabase } from '../config/supabase';
import { decode } from 'base64-arraybuffer';
import { callAiProxy } from '../utils/aiProxy';

export interface UserBudget {
    id: string;
    user_id: string;
    month?: string;
    monthly_income: number;
    fixed_costs: number;
    savings_goal: number;
    safe_allowance: number; // Derived dynamically or stored
    is_setup_complete: boolean;
}

export interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    title: string;
    category: string;
    date: string;
    receipt_id?: string;
}

export interface CustomCategory {
    id: string;
    user_id: string;
    label: string;
    icon: string;
}

export interface RecurringSubscription {
    id: string;
    user_id: string;
    title: string;
    amount: number;
    category: string;
    billing_day: number;
    is_active: boolean;
    last_processed: string | null;
}

export const expenseService = {
    async fetchUserBudget(monthStr?: string): Promise<UserBudget | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const targetMonth = monthStr || new Date().toISOString().slice(0, 7);

        let { data, error } = await supabase
            .from('user_budgets')
            .select('*')
            .eq('user_id', user.id)
            .eq('month', targetMonth)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching budget:', error.message);
            throw error;
        }

        // --- ROLLING MONTH LOGIC ---
        // If viewing current month and it doesn't exist, roll over the previous settings automatically
        if (!data && targetMonth === new Date().toISOString().slice(0, 7)) {
            const { data: previousBudget } = await supabase
                .from('user_budgets')
                .select('*')
                .eq('user_id', user.id)
                .order('month', { ascending: false })
                .limit(1)
                .single();

            if (previousBudget) {
                const { id, ...budgetToDup } = previousBudget; // Strip old UUID
                const { data: created } = await supabase
                    .from('user_budgets')
                    .insert({ ...budgetToDup, month: targetMonth })
                    .select()
                    .single();

                if (created) return created as UserBudget;
            }
        }

        return data as UserBudget | null;
    },

    async saveUserBudget(budget: Partial<UserBudget>, targetMonth?: string): Promise<UserBudget | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Calculate safe allowance roughly: (Income - Fixed - Savings)
        const income = budget.monthly_income || 0;
        const fixed = budget.fixed_costs || 0;
        const savings = budget.savings_goal || 0;
        const remaining = income - fixed - savings;
        const safeAllowance = Math.max(0, remaining);

        const monthToSave = targetMonth || budget.month || new Date().toISOString().slice(0, 7);
        const { id, ...budgetWithoutId } = budget as any; // Ignore existing ID for flexible upserting

        const payload = {
            ...budgetWithoutId,
            user_id: user.id,
            safe_allowance: safeAllowance,
            month: monthToSave
        };

        const { data, error } = await supabase
            .from('user_budgets')
            .upsert(payload, { onConflict: 'user_id, month' })
            .select()
            .single();

        if (error) {
            console.error('Error saving budget:', error);
            throw error;
        }

        return data as UserBudget;
    },

    async checkDuplicateReceipt(storeName: string, totalAmount: number, purchaseDate: string): Promise<{ isDuplicate: boolean; existingDate?: string; existingStore?: string; existingTotal?: number }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { isDuplicate: false };

        // Extract first word of store name for partial matching (e.g. "Walmart Supercenter" → "%walmart%")
        const storeKeyword = storeName.trim().split(/\s+/)[0] || storeName;

        // Pass 1: Match on partial store name + close total + same date
        const { data: pass1 } = await supabase
            .from('receipt_scans')
            .select('id, store_name, total_amount, purchase_date')
            .eq('user_id', user.id)
            .ilike('store_name', `%${storeKeyword}%`)
            .gte('total_amount', totalAmount - 2)
            .lte('total_amount', totalAmount + 2)
            .eq('purchase_date', purchaseDate)
            .limit(1);

        if (pass1 && pass1.length > 0) {
            return { isDuplicate: true, existingDate: pass1[0].purchase_date, existingStore: pass1[0].store_name, existingTotal: pass1[0].total_amount };
        }

        // Pass 2: No date match — just store + very close total (within $0.50) in the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: pass2 } = await supabase
            .from('receipt_scans')
            .select('id, store_name, total_amount, purchase_date')
            .eq('user_id', user.id)
            .ilike('store_name', `%${storeKeyword}%`)
            .gte('total_amount', totalAmount - 0.5)
            .lte('total_amount', totalAmount + 0.5)
            .gte('scanned_at', weekAgo.toISOString())
            .limit(1);

        if (pass2 && pass2.length > 0) {
            return { isDuplicate: true, existingDate: pass2[0].purchase_date, existingStore: pass2[0].store_name, existingTotal: pass2[0].total_amount };
        }

        return { isDuplicate: false };
    },

    async fetchTransactions(startDate: string, endDate: string): Promise<Transaction[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: transactions, error: e1 } = await supabase
            .from('transactions')
            .select(`*, receipt_scans (subtotal, tax_amount, payment_method)`)
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate);

        // FIX: Fetch legacy receipt scans by purchase_date, NOT scanned_at
        const { data: scans, error: e2 } = await supabase
            .from('receipt_scans')
            .select('*')
            .eq('user_id', user.id)
            .gte('purchase_date', startDate)
            .lte('purchase_date', endDate);

        if (e1 || e2) {
            console.error('Error fetching activity:', e1 || e2);
            throw e1 || e2;
        }

        const linkedReceiptIds = new Set((transactions || []).map(t => t.receipt_id).filter(Boolean));

        // FIX: Map legacy scans using purchase_date
        const mappedLegacyScans = (scans || [])
            .filter(s => !linkedReceiptIds.has(s.id))
            .map(s => ({
                id: s.id,
                user_id: s.user_id,
                amount: s.total_amount,
                title: s.store_name,
                category: 'groceries',
                date: s.purchase_date,
                receipt_id: s.id
            }));

        const all = [...(transactions || []), ...mappedLegacyScans];
        // This sorts them perfectly from Newest to Oldest!
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    async addTransaction(amount: number, title: string, category: string, dateStr?: string): Promise<Transaction | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const payload = {
            user_id: user.id,
            amount,
            title,
            category,
            date: dateStr || new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('transactions')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
        return data as Transaction;
    },

    async deleteTransaction(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('deleteTransaction: No user found');
            throw new Error('Not authenticated');
        }

        // 1. First, find out if this is a transaction that has a linked receipt
        const { data: transaction } = await supabase
            .from('transactions')
            .select('receipt_id')
            .eq('id', id)
            .single();

        if (transaction?.receipt_id) {
            // 2. If it HAS a receipt, delete the SCAN (the Parent)
            // This will automatically delete the transaction too because of CASCADE
            await supabase
                .from('receipt_scans')
                .delete()
                .eq('id', transaction.receipt_id);
        } else {
            // 3. If it's a manual entry OR a legacy scan (where the ID IS the scan ID)
            // Try deleting from transactions first
            const { count } = await supabase.from('transactions').delete({ count: 'exact' }).eq('id', id);

            // If nothing was deleted, it's a legacy scan ID, so delete from receipt_scans
            if (count === 0) {
                await supabase.from('receipt_scans').delete().eq('id', id);
            }
        }
    },

    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('updateTransaction: No user found');
            throw new Error('Not authenticated');
        }

        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }

        return data as Transaction;
    },

    async processReceipt(base64Image: string): Promise<{
        items: { clean_name: string; original_text: string; price: number; category: string; }[];
        store_name: string;
        purchase_date: string;
        payment_method: string;
        subtotal: number;
        tax_amount: number;
        total_spent: number;
    } | null> {
        try {
            const prompt = `
You are RECEIPT-GPT, a world-class Data Extraction Engine built for a student grocery budget app.
Every image must first pass a Receipt Validation gate. Zero tolerance for errors.

═══════════════════════════════════════════════════
STEP 0 — VALIDATION: IS THIS A RECEIPT?
═══════════════════════════════════════════════════
Before extracting ANYTHING, determine if this image is a genuine retail/grocery/service receipt.
A valid receipt MUST have ALL THREE: (1) a store name, (2) a list of items with prices, (3) a total amount.

NOT a receipt: product photos, food photos (e.g., a cake with a price tag), menus, screenshots,
business cards, price tags on individual items, or any image that is NOT a printed/digital transaction receipt.

If NOT a receipt → set "is_receipt": false, ALL other fields null or empty array, and STOP. Do not extract anything else.

═══════════════════════════════════════════════════
STEP 1 — READ PASS (only if is_receipt is true)
═══════════════════════════════════════════════════
Read the entire receipt top-to-bottom. Identify:
  a) The store name and logo area (top of receipt)
  b) The itemized list (middle section)
  c) The subtotal, tax, and total lines (bottom section)
  d) The payment footer (e.g., "VISA", "CASH TENDERED", "DEBIT")
  e) The date/time stamp (can appear at top OR bottom)

═══════════════════════════════════════════════════
STEP 2 — EXTRACT EACH FIELD (RULES BELOW)
═══════════════════════════════════════════════════

[STORE NAME]
- Normalize to the official consumer-facing brand name.
  ✅ "WAL-MART SUPERCENTRE" → "Walmart"
  ✅ "LOBLAWS #1047" → "Loblaws"
  ✅ "T&T SUPERMARKET" → "T&T Supermarket"
- If uncertain, use the most recognizable form of the name. Never return a store number or internal code.

[PURCHASE DATE]
- Extract the transaction date — NOT the print date or "best before" date.
- Return in strict ISO 8601 format: YYYY-MM-DD.
- If the year is ambiguous (e.g., "27/03"), infer from context (use current year: 2026).
- If no date is found anywhere, return null.

[PAYMENT METHOD]
- Return EXACTLY one of: "Cash", "Credit", "Debit", "Digital"
- Mapping hints: VISA/MC/AMEX = "Credit", INTERAC = "Debit", Apple Pay/Google Pay/Tap = "Digital", CASH/CHANGE = "Cash"
- Default to "Debit" if unclear but a card was used.

[ITEMS — THE MOST CRITICAL SECTION]
Extract EVERY purchasable line item. Apply ALL of these rules:

RULE 1 — QUANTITY & UNIT PRICING:
  If a receipt shows "2 x $1.49", list it as ONE item with price = 2.98 (the extended total).
  If it shows "0.437 kg @ $8.79/kg", list it with price = the resulting total (0.437 * 8.79 ≈ 3.84).

RULE 2 — CLEAN NAME EXPANSION:
  Expand ALL abbreviations and truncations to be human-readable.
  ✅ "ORG LTCE" → "Organic Lettuce"
  ✅ "2% MLK 2L" → "2% Milk 2L"
  ✅ "CHKN BRST BNL" → "Boneless Chicken Breast"
  ✅ "PC BLK BEAN" → "President's Choice Black Beans"

RULE 3 — DISCOUNTS & COUPONS (CRITICAL):
  When a discount line appears (e.g., "LOYALTY SAVE -$1.50", "COUPON -$2.00", "MBR PRICE -$0.89"):
  a) Do NOT subtract it from the preceding item's price.
  b) List it as a SEPARATE item with category "Discount" and a NEGATIVE price (e.g., -1.50).
  c) This ensures total reconciliation is possible.

RULE 4 — WHAT TO SKIP:
  Do NOT include: tax lines, total lines, subtotal lines, "CHANGE DUE", "POINTS EARNED", "SAVINGS TOTAL", or any non-purchasable footer text.

RULE 5 — CATEGORY ASSIGNMENT:
  Assign the most accurate category from this EXACT list:
  "Produce", "Meat", "Dairy", "Pantry", "Frozen", "Bakery", "Beverages", "Snacks", "Household", "Personal Care", "Discount", "Other"

═══════════════════════════════════════════════════
STEP 3 — TOTALS RECONCILIATION
═══════════════════════════════════════════════════
After extracting all items:
  a) Sum all item prices (including negative discount prices).
  b) This sum should approximately equal the subtotal on the receipt.
  c) total_spent = subtotal + tax_amount (must match the receipt's "TOTAL" line exactly).
  d) If your summed items do NOT match the receipt's subtotal, re-read the items section and correct the discrepancy before responding.

═══════════════════════════════════════════════════
STEP 4 — SELF-AUDIT CHECKLIST (MANDATORY)
═══════════════════════════════════════════════════
Before generating your response, verify each point internally:
  □ is_receipt correctly set?
  □ Does store_name look like a real brand name (not a code)?
  □ Is purchase_date in YYYY-MM-DD format with the correct year?
  □ Is payment_method exactly one of the 4 allowed values?
  □ Are all abbreviations in clean_name fully expanded and human-readable?
  □ Are all discounts listed as SEPARATE items with NEGATIVE prices?
  □ Does sum(items[].price) ≈ subtotal?
  □ Does subtotal + tax_amount = total_spent?
  □ Are there any header/footer lines accidentally included as items?
If ANY check fails — fix it silently and then produce the output.

═══════════════════════════════════════════════════
OUTPUT FORMAT — STRICT JSON ONLY
═══════════════════════════════════════════════════
Return ONLY a valid JSON object. No markdown. No prose. No backticks. No code fences.

{
  "is_receipt": true,
  "store_name": "string or null",
  "purchase_date": "YYYY-MM-DD or null",
  "payment_method": "Cash | Credit | Debit | Digital | null",
  "items": [
    {
      "clean_name": "Fully expanded human-readable name",
      "original_text": "Exact text from receipt",
      "price": 0.00,
      "category": "Produce | Meat | Dairy | Pantry | Frozen | Bakery | Beverages | Snacks | Household | Personal Care | Discount | Other"
    }
  ],
  "subtotal": 0.00,
  "tax_amount": 0.00,
  "total_spent": 0.00
}
            `;

            // Call Gemini via Edge Function proxy — API key never leaves the server
            const data = await callAiProxy('scan-receipt', { base64Image, prompt });
            const textJSON = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (textJSON) {
                const parsed = JSON.parse(textJSON);

                // 🚫 GATE: If the AI determined this is NOT a receipt, reject immediately
                if (parsed.is_receipt === false) {
                    return null;
                }

                const { data: { user } } = await supabase.auth.getUser();
                let imageUrl: string | null = null;

                if (user && parsed) {
                    try {
                        const fileName = `${user.id}/${Date.now()}.jpg`;
                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('receipts')
                            .upload(fileName, decode(base64Image), {
                                contentType: 'image/jpeg',
                            });

                        if (uploadError) {
                            console.error('Error uploading receipt image:', uploadError);
                        } else if (uploadData) {
                            const { data: publicUrlData } = supabase.storage
                                .from('receipts')
                                .getPublicUrl(fileName);
                            imageUrl = publicUrlData.publicUrl;
                        }
                    } catch (e) {
                        console.error('Failed to upload receipt image:', e);
                    }
                }

                // We return both parsed data AND imageUrl instead of saving to DB immediately
                return { ...parsed, imageUrl };
            }
            return null;
        } catch (error) {
            console.error("Gemini OCR error:", error);
            throw error;
        }
    },

    // Smart category mapping: OCR item categories → dashboard categories
    _mapReceiptCategory(itemCategory: string): string {
        const map: Record<string, string> = {
            'produce': 'groceries', 'meat': 'groceries', 'dairy': 'groceries',
            'pantry': 'groceries', 'frozen': 'groceries', 'bakery': 'groceries',
            'household': 'bills', 'other': 'groceries',
            'beverage': 'food', 'snack': 'food', 'deli': 'food',
        };
        return map[(itemCategory || '').toLowerCase()] || 'groceries';
    },

    async confirmReceiptScan(parsed: any, imageUrl: string | null, finalTotal: number, finalStoreName: string, finalDate: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !parsed) return;

        // 1. Log the Scan Header
        const { data: scan } = await supabase.from('receipt_scans').insert({
            user_id: user.id,
            store_name: finalStoreName,
            total_amount: finalTotal,
            purchase_date: finalDate,
            payment_method: parsed.payment_method,
            subtotal: parsed.subtotal,
            tax_amount: parsed.tax_amount,
            image_url: imageUrl
        }).select().single();

        if (scan) {
            // 2. Add to Transactions — use smart category from receipt items
            const topCategory = parsed.items?.[0]?.category ? expenseService._mapReceiptCategory(parsed.items[0].category) : 'groceries';
            await supabase.from("transactions").insert({
                user_id: user.id,
                receipt_id: scan.id,
                amount: finalTotal,
                title: `Grocery: ${finalStoreName}`,
                category: topCategory,
                date: finalDate
            });

            // 3. Process items for price history
            if (parsed.items && Array.isArray(parsed.items)) {
                for (const item of parsed.items) {
                    const { data: ing } = await supabase.from('ingredients').upsert({
                        name: item.clean_name,
                        category: item.category
                    }, { onConflict: 'name' }).select().single();

                    if (ing) {
                        await supabase.from('price_history').insert({
                            receipt_id: scan.id,
                            ingredient_id: ing.id,
                            price: item.price,
                            original_text: item.original_text,
                            scanned_at: new Date(finalDate).toISOString()
                        });
                    }
                }
            }
        }
    },
    async fetchReceiptItems(receiptId: string) {
        // 1. Fetch scan header
        const { data: scan } = await supabase
            .from('receipt_scans')
            .select('*')
            .eq('id', receiptId)
            .single();

        if (!scan) return null;

        // 2. Fetch items
        const { data: items } = await supabase
            .from('price_history')
            .select(`
                price,
                original_text,
                ingredients (
                    name,
                    category
                )
            `)
            .eq('receipt_id', receiptId);

        return {
            ...scan,
            items: (items || []).map((it: any) => ({
                clean_name: it.ingredients?.name,
                price: it.price,
                original_text: it.original_text,
                category: it.ingredients?.category
            }))
        };
    },

    async updateReceiptScan(receiptId: string, updatedData: any): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !updatedData) return;

        // 1. Update the Receipt Scan Header
        await supabase.from('receipt_scans').update({
            store_name: updatedData.store_name,
            total_amount: updatedData.total_spent,
            purchase_date: updatedData.purchase_date,
            subtotal: updatedData.subtotal,
            tax_amount: updatedData.tax_amount
        }).eq('id', receiptId).eq('user_id', user.id);

        // 2. Update the connected Transaction
        await supabase.from('transactions').update({
            amount: updatedData.total_spent,
            title: `Grocery: ${updatedData.store_name}`,
            date: updatedData.purchase_date
        }).eq('receipt_id', receiptId).eq('user_id', user.id);

        // 3. Clear old price history and regenerate to easily handle deleted/added items
        await supabase.from('price_history').delete().eq('receipt_id', receiptId);

        if (updatedData.items && Array.isArray(updatedData.items)) {
            for (const item of updatedData.items) {
                const { data: ing } = await supabase.from('ingredients').upsert({
                    name: item.clean_name,
                    category: item.category || 'other'
                }, { onConflict: 'name' }).select().single();

                if (ing) {
                    await supabase.from('price_history').insert({
                        receipt_id: receiptId,
                        ingredient_id: ing.id,
                        price: item.price,
                        original_text: item.original_text || item.clean_name,
                        scanned_at: new Date(updatedData.purchase_date).toISOString()
                    });
                }
            }
        }
    },

    // --- Custom Categories ---
    async fetchCustomCategories(): Promise<CustomCategory[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('custom_categories')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
        return data as CustomCategory[];
    },

    async addCustomCategory(label: string, icon: string): Promise<CustomCategory | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('custom_categories')
            .insert({ user_id: user.id, label, icon })
            .select()
            .single();

        if (error) {
            console.error('Error adding category:', error);
            throw error;
        }
        return data as CustomCategory;
    },

    async deleteCustomCategory(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('custom_categories')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    },

    // --- Recurring Subscriptions ---
    async fetchSubscriptions(): Promise<RecurringSubscription[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('recurring_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('billing_day', { ascending: true });

        if (error) {
            console.error('Error fetching subscriptions:', error);
            return [];
        }
        return data as RecurringSubscription[];
    },

    async addSubscription(title: string, amount: number, category: string, billing_day: number): Promise<RecurringSubscription | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('recurring_subscriptions')
            .insert({ user_id: user.id, title, amount, category, billing_day })
            .select()
            .single();

        if (error) throw error;
        return data as RecurringSubscription;
    },

    async deleteSubscription(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('recurring_subscriptions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    },

    async processDueSubscriptions(): Promise<void> {
        // Find subscriptions due for today (simulated client-side cron processing since it's an app).
        // A better approach would be an edge function/DB cron job, but we'll do it on-open
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date();
        const currentDay = today.getDate();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        // fetch active subs that bill on or before today
        const { data: subs, error } = await supabase
            .from('recurring_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .lte('billing_day', currentDay);

        if (error || !subs) return;

        for (const sub of subs) {
            // Check if we already processed it this month
            // Ensure last_processed is before startOfMonth to avoid double billing
            const needsProcessing = !sub.last_processed || new Date(sub.last_processed) < new Date(startOfMonth);

            if (needsProcessing) {
                // Determine billing date (could have been days ago)
                const billingDate = new Date(today.getFullYear(), today.getMonth(), sub.billing_day);

                await expenseService.addTransaction(sub.amount, sub.title, sub.category, billingDate.toISOString());

                // Update last_processed
                await supabase
                    .from('recurring_subscriptions')
                    .update({ last_processed: new Date().toISOString() })
                    .eq('id', sub.id);
            }
        }
    },
};
