import { supabase } from "../config/supabase";

export const mealService = {
  // Retrieves the current week's plan from the database
  getCurrentWeekPlan: async (userId: string, weekStartString: string) => {
    try {
      const { data, error } = await supabase
        .from("weekly_meal_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start_date", weekStartString)
        .maybeSingle();

      if (error) throw error;
      return data ? data.plan_data : null;
    } catch (error) {
      console.error("Error fetching current week plan:", error);
      return null;
    }
  },

  // Generates a purely local, database-driven week of meals
  generateStudentWeek: async (profile: any, weekStartString: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session found");
      if (!weekStartString) throw new Error("No week start date provided");

      // Check what we had for dinner yesterday (Sunday) so Monday Lunch is accurate
      const currentMonday = new Date(weekStartString);
      const prevMonday = new Date(currentMonday);
      prevMonday.setDate(currentMonday.getDate() - 7);
      const prevWeekStartString = prevMonday.toISOString().split("T")[0];

      const { data: lastPlanRecord } = await supabase
        .from("weekly_meal_plans")
        .select("plan_data")
        .eq("user_id", user.id)
        .eq("week_start_date", prevWeekStartString)
        .maybeSingle();

      let carryOverSundayDinner = lastPlanRecord?.plan_data?.Sunday?.Dinner || null;
      const dinnersToFetch = carryOverSundayDinner ? 7 : 8; // If no carryover, we need an extra meal for Monday lunch

      // 1. Build the shared Dietary / Allergy Query logic
      const buildSafeQuery = (limit: number = 30) => {
        let query = supabase
          .from("production_meals")
          .select("*")
          .not("image_url", "is", null) // Hard requirement: Only dishes with images
          .limit(limit);

        // Apply Diet
        if (profile.diet_type && profile.diet_type !== "None" && profile.diet_type !== "Classic (Everything)") {
          query = query.contains("dietary_tags", `["${profile.diet_type.toLowerCase()}"]`);
        }

        // Apply Allergies
        if (profile.allergies && profile.allergies.length > 0) {
          const lowerCaseAllergies = profile.allergies.map((a: string) => a.toLowerCase());
          query = query.not("allergens", "cs", JSON.stringify(lowerCaseAllergies));
        }

        return query;
      };

      // 2. Fetch the Raw Safe Pools
      const { data: allMeals, error: fetchErr } = await buildSafeQuery(150);
      let safeMeals = allMeals || [];

      // Fallback just in case the query filters down to 0
      if (safeMeals.length < 15) {
        const { data: fallbackMeals } = await supabase.from("production_meals").select("*").not("image_url", "is", null).limit(30);
        safeMeals = fallbackMeals || [];
      }

      // Shuffle them up
      safeMeals = safeMeals.sort(() => 0.5 - Math.random());

      // Attempt to identify breakfast-like meals (by name)
      const breakfastKeywords = ["breakfast", "egg", "pancake", "waffle", "toast", "oat", "poha", "upma", "smoothie"];
      let safeBreakfasts = safeMeals.filter((m: any) =>
        breakfastKeywords.some(keyword => m.dish_name.toLowerCase().includes(keyword))
      );

      let safeDinners = safeMeals.filter((m: any) => !safeBreakfasts.includes(m));

      // If we don't have enough distinct breakfasts/dinners, just split the pool in half randomly
      if (safeBreakfasts.length < 7 || safeDinners.length < 8) {
        const mid = Math.floor(safeMeals.length / 3);
        safeBreakfasts = safeMeals.slice(0, mid);
        safeDinners = safeMeals.slice(mid);
      }

      // 3. Assemble the Week
      const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const weeklyPlan: any = {};

      // Time tracking to avoid overriding partial weeks
      const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
      const now = new Date();
      const targetDate = new Date(weekStartString);
      const isCurrentWeek =
        now.toISOString().split("T")[0] >= weekStartString &&
        now.toISOString().split("T")[0] <= new Date(targetDate.setDate(targetDate.getDate() + 6)).toISOString().split("T")[0];

      daysOfWeek.forEach((day, index) => {
        // Skip past days if generating mid-week
        if (isCurrentWeek && index < todayIndex) {
          weeklyPlan[day] = null;
          return;
        }

        // Modulo math ensures we never run out of array length (if they exist)
        // Modulo math ensures we never run out of array length (if they exist)
        const breakfast = safeBreakfasts.length > 0 ? safeBreakfasts[index % safeBreakfasts.length] : null;
        const dinner = safeDinners.length > 0 ? safeDinners[index % safeDinners.length] : null;

        let lunch;
        let isLeftover = true;

        if (index === 0 || (isCurrentWeek && index === todayIndex)) {
          if (index === 0 && carryOverSundayDinner) {
            lunch = carryOverSundayDinner;
          } else {
            lunch = safeBreakfasts.length > 0 ? safeBreakfasts[(safeBreakfasts.length - 1 + index) % safeBreakfasts.length] : null;
            isLeftover = false; // Fresh Monday lunch!
          }
        } else {
          // Normal fallback logic: Lunch is yesterday's dinner
          const yesterdayIndex = safeDinners.length > 0 ? (index - 1) % safeDinners.length : 0;
          lunch = safeDinners.length > 0 ? safeDinners[yesterdayIndex] : null;
          isLeftover = true;
        }

        weeklyPlan[day] = {
          Breakfast: breakfast,
          Dinner: dinner,
          Lunch: lunch ? {
            ...lunch,
            isLeftover,
            dish_name: isLeftover ? `${lunch.dish_name} (Leftovers)` : lunch.dish_name
          } : null
        };
      });

      // 4. Save to weekly_meal_plans
      const { error: upsertError } = await supabase
        .from("weekly_meal_plans")
        .upsert(
          {
            user_id: user.id,
            plan_data: weeklyPlan,
            week_start_date: weekStartString,
          },
          { onConflict: "user_id, week_start_date" },
        );

      if (upsertError) throw upsertError;

      // 🔴 NEW: Clean up orphaned custom meal overrides for this week to prevent ghosting!
      const [y, m, d] = weekStartString.split('-').map(Number);
      const endDate = new Date(y, m - 1, d + 6);
      const endDateString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      await supabase
        .from("custom_events")
        .delete()
        .eq("user_id", user.id)
        .eq("category", "meal")
        .gte("event_date", weekStartString)
        .lte("event_date", endDateString);
      return weeklyPlan;
    } catch (error) {
      console.error("Meal Generation Error:", error);
      throw error;
    }
  },

  // 🟢 TARGETED SWAP: Replace only one meal directly from DB
  swapSingleMeal: async (
    profile: any,
    day: string,
    mealType: string,
    currentPlan: any,
    weekStartString: string,
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session found");

      // 1. Build Query for Replacement
      let query = supabase
        .from("production_meals")
        .select("*")
        .not("image_url", "is", null)
        .limit(100);

      if (profile.diet_type && profile.diet_type !== "None" && profile.diet_type !== "Classic (Everything)") {
        query = query.contains("dietary_tags", `["${profile.diet_type.toLowerCase()}"]`);
      }
      if (profile.allergies && profile.allergies.length > 0) {
        const lowerCaseAllergies = profile.allergies.map((a: string) => a.toLowerCase());
        query = query.not("allergens", "cs", JSON.stringify(lowerCaseAllergies));
      }

      const { data: allSwaps, error } = await query;
      if (error) throw error;

      let possibleSwaps = allSwaps || [];
      const breakfastKeywords = ["breakfast", "egg", "pancake", "waffle", "toast", "oat", "poha", "upma", "smoothie"];

      if (mealType === "Breakfast") {
        possibleSwaps = possibleSwaps.filter((m: any) =>
          breakfastKeywords.some(keyword => m.dish_name.toLowerCase().includes(keyword))
        );
      } else {
        possibleSwaps = possibleSwaps.filter((m: any) =>
          !breakfastKeywords.some(keyword => m.dish_name.toLowerCase().includes(keyword))
        );
      }

      // Fallback if keyword filtering resulted in empty array
      if (possibleSwaps.length === 0 && allSwaps && allSwaps.length > 0) {
        possibleSwaps = allSwaps;
      }

      if (!possibleSwaps || possibleSwaps.length === 0) {
        throw new Error(`Could not find a replacement for ${mealType}`);
      }

      // Pick a random replacement
      const randomReplacement = possibleSwaps[Math.floor(Math.random() * possibleSwaps.length)];

      let updatedPlan = JSON.parse(JSON.stringify(currentPlan));

      if (mealType === "Breakfast") {
        updatedPlan[day].Breakfast = randomReplacement;
      } else if (mealType === "Dinner") {
        updatedPlan[day].Dinner = randomReplacement;

        // Cascade leftover to tomorrow if it's a dinner swap
        const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const todayIndex = daysOfWeek.indexOf(day);

        if (todayIndex !== -1 && todayIndex < 6) {
          const tomorrow = daysOfWeek[todayIndex + 1];
          if (updatedPlan[tomorrow] && updatedPlan[tomorrow].Lunch) {
            updatedPlan[tomorrow].Lunch = {
              ...randomReplacement,
              isLeftover: true,
              dish_name: `${randomReplacement.dish_name} (Leftovers)`
            };
          }
        }
      }

      // 3. Persist back to Supabase
      await supabase.from("weekly_meal_plans").upsert(
        {
          user_id: user.id,
          plan_data: updatedPlan,
          week_start_date: weekStartString,
        },
        { onConflict: "user_id, week_start_date" }
      );

      // 4. Clean up any manual time overrides (ghosts) for this specific meal
      const daysOfWeekList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const targetDayIndex = daysOfWeekList.indexOf(day);
      if (targetDayIndex !== -1) {
          const [y, m, d] = weekStartString.split('-').map(Number);
          const targetDateObj = new Date(y, m - 1, d + targetDayIndex);
          const targetDateString = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;

          const { data: existingOverrides } = await supabase
              .from("custom_events")
              .select("id, title")
              .eq("user_id", user.id)
              .eq("category", "meal")
              .eq("event_date", targetDateString);

          if (existingOverrides) {
              const overridesToDelete = existingOverrides.filter((o: any) => o.title.toLowerCase().includes(mealType.toLowerCase()));
              for (const o of overridesToDelete) {
                  await supabase.from("custom_events").delete().eq("id", o.id);
              }
          }
      }

      return updatedPlan;
    } catch (error) {
      console.error("Swap Error:", error);
      throw error;
    }
  },

  // 🟢 SAVE AI INSTRUCTIONS: Updates a specific meal in the database with generated steps
  saveInstructionsToPlan: async (
    day: string,
    mealType: string,
    currentPlan: any,
    weekStartString: string,
    generatedInstructions: any,
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session found");

      // Clone the plan so we don't mutate React state directly
      let updatedPlan = JSON.parse(JSON.stringify(currentPlan));

      // Inject the AI instructions into the correct meal
      if (updatedPlan[day] && updatedPlan[day][mealType]) {
        updatedPlan[day][mealType].instructions = generatedInstructions;
      }

      // Save back to Supabase
      const { error } = await supabase.from("weekly_meal_plans").upsert(
        {
          user_id: user.id,
          plan_data: updatedPlan,
          week_start_date: weekStartString,
        },
        { onConflict: "user_id, week_start_date" },
      );

      if (error) throw error;

      return updatedPlan;
    } catch (error) {
      console.error("Error saving instructions:", error);
      throw error;
    }
  },
};
