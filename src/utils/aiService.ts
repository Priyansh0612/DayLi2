import { callAiProxy } from './aiProxy';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export type ExtractedCourseData = {
    course: {
        code: string;
        name: string;
        semester?: string;
        professor_name?: string;
        professor_email?: string;
        location?: string;
    };
    slots: {
        day: string;
        start: string;
        end: string;
        type: string;
        location: string;
        location_note?: string;
    }[];
    assessments: {
        title: string;
        type: string;
        weight: number;
        due_date: string | null;
    }[];
    variants?: {
        variant_name: string;   // e.g. "Without Lab Component"
        course_codes: string[]; // e.g. ["GEOL 1130", "ENST 1131"]
        assessments: {
            title: string;
            type: string;
            weight: number;
            due_date: string | null;
        }[];
    }[];
    reading_week_start?: string | null;
    reading_week_end?: string | null;
};

export const extractCourseFromPDF = async (fileUri: string): Promise<ExtractedCourseData | null> => {
    try {
        let base64 = '';

        if (Platform.OS === 'web') {
            // 🟢 WEB: Fetch blob and convert to Base64
            const response = await fetch(fileUri);
            const blob = await response.blob();
            base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    // Remove "data:application/pdf;base64," prefix if present
                    resolve(result.split(',')[1] || result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } else {
            // 📱 MOBILE: Use Expo FileSystem
            base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: 'base64',
            });
        }

        // 2. Construct the Prompt
        const prompt = `
      You are a precision academic data extraction engine built for a student planner app used by 50,000+ university students.
      Your extraction accuracy directly impacts students' grades and schedules. Errors are unacceptable.
      
      Extract data from this Course Outline PDF. Return a STRICT JSON object with no markdown formatting.


      ────────────────────────────────────────
      COURSE INFO RULES:
      ────────────────────────────────────────
      - "code": Extract ONLY the short department + number form. 
        ✅ CORRECT: "COMP 3413"
        ❌ WRONG: "COMP-3413-WA", "COMP 3413 Winter 2026", "COMP3413WA"
      - "semester": Extract from the document header, title page, or body text (e.g., "Winter 2026", "Fall 2025").
      - If professor_name, professor_email, or location are not found, return null for those fields.

      ────────────────────────────────────────
      CLASS SLOTS RULES:
      ────────────────────────────────────────
      Extract ALL scheduled time entries from the PDF, but CLASSIFY them correctly using the "type" field:
        - Actual classes → "type": "Lecture", "Lab", "Tutorial", or "Seminar"
        - Office Hours, Consultation Hours, TA Hours, Drop-in Hours → "type": "Office Hours"
      
      ⚠️ CRITICAL: NEVER mix them up. Office hours must ALWAYS have "type": "Office Hours".
      A student's timetable must clearly distinguish between classes and office hours.

      MULTI-DAY RULE: If a class meets on multiple days (e.g., "Mon/Wed 2:30–3:45" or "T/Th 10:00–11:15"),
      you MUST create a SEPARATE slot object for EACH day. Never combine them into one entry.
        ✅ CORRECT: Two objects — one with "day": "Monday", one with "day": "Wednesday"
        ❌ WRONG: One object with "day": "Monday/Wednesday"

      TIME FORMAT: Always use 24-hour HH:MM format.
        "2:30 PM" → "14:30", "11:15 AM" → "11:15", "9 AM" → "09:00"

      ────────────────────────────────────────
      ASSESSMENT RULES (CRITICAL — READ CAREFULLY):
      ────────────────────────────────────────
      1. "EXPLODE" GROUPED ITEMS: If you see "Assignments (30%) due Oct 7, Nov 6, Nov 25", you MUST return 3 separate items.
      2. CALCULATE WEIGHTS: Divide the total weight by the number of items (e.g., 30% / 3 = 10% each).
      3. NO SUMMARIES: Do NOT return the main "Assignments" entry if you have listed the individual dates. Only return the granular items.
      4. NAMING: If no specific names are given, use "Assessment 1", "Assessment 2", etc.
      5. EXPLODE RECURRING ITEMS: If the syllabus implies multiple items (e.g., "10 Discussions at 1% each" or "Weekly Quizzes (10%)"), you MUST create separate, individual entries for EVERY single one (e.g., 10 separate entries named "Discussion 1", "Discussion 2", etc., each with a weight of 1). Do NOT group them into a single 10% item.
      6. THE "DROP LOWEST" / "BEST OF" RULE: If a syllabus states "5 quizzes, drop the lowest, 20% total" (or similar), you MUST extract ALL 5 quizzes so the student has every date on their schedule. To maintain the correct course total, distribute the final weight evenly across ALL events (e.g., 20% / 5 = 4% each). You MUST append the phrase " (Drop Lowest)" to the title of these items (e.g., "Quiz 1 (Drop Lowest)").
      7. WEIGHT SANITY CHECK: The total weight of ALL assessments (or each variant's assessments) MUST equal exactly 100%. If the weights you extracted don't sum to 100%, re-read the PDF and correct them before responding.
      8. TYPE MUST be one of: assignment, quiz, project, midterm, final, lab, discussion, exam, other. No other values.
      9. PARTICIPATION / ATTENDANCE: If listed as a graded component (e.g., "Participation 10%"), include it as a SINGLE assessment with type "other" and due_date null.

      ❌ BAD Output (parent entry duplicated alongside children):
      [
        { "title": "Assignments", "weight": 30 },
        { "title": "Assignment 1", "weight": 10 },
        { "title": "Assignment 2", "weight": 10 }
      ]

      ✅ GOOD Output (only granular items, no parent):
      [
        { "title": "Assignment 1", "weight": 10, "due_date": "2026-01-15", "type": "assignment" },
        { "title": "Assignment 2", "weight": 10, "due_date": "2026-02-12", "type": "assignment" },
        { "title": "Assignment 3", "weight": 10, "due_date": "2026-03-10", "type": "assignment" }
      ]

      ────────────────────────────────────────
      READING WEEK EXTRACTION:
      ────────────────────────────────────────
      Look for "Reading Week", "Study Break", "Spring Break", or "Mid-term Break".
      - If the syllabus says "Reading Week: Feb 16-20", extract start as 2026-02-16 and end as 2026-02-20.
      - If it only mentions a start date, estimate the end date as 5 days later.
      - If NOT mentioned, return null for both fields.

      ────────────────────────────────────────
      MULTI-STREAM / VARIANT COURSES:
      ────────────────────────────────────────
      CHECK FOR VARIANTS:
      1. Does the outline list different course codes with different grading schemes? 
         (e.g. "Courses without Lab: GEOL 1130" vs "Courses with Lab: GEOL 1131")
      2. If YES, populate the "variants" array in the JSON.
      3. "variant_name" should be descriptive (e.g., "Without Lab Component", "With Lab Component").
      4. "course_codes" should list the codes that belong to that variant.
      5. "assessments" inside the variant must equal 100% for that specific stream.
      6. IMPORTANT: If variants are found, leave the main "assessments" array EMPTY [].
      7. If NO variants exist, leave the "variants" array EMPTY [].

      ────────────────────────────────────────
      SELF-VERIFICATION (DO THIS BEFORE RESPONDING):
      ────────────────────────────────────────
      Before you output the JSON, mentally verify:
      □ Do all assessment weights sum to exactly 100%? (or each variant sums to 100%)
      □ Are there any duplicate/parent entries that should have been exploded?
      □ Are all dates in YYYY-MM-DD format with the correct year?
      □ Are office hours excluded from slots?
      □ Is the course code in SHORT form only?
      □ Does every slot have a valid 24h time format?
      If ANY check fails, fix the data before responding.

      ────────────────────────────────────────
      JSON STRUCTURE (return EXACTLY this shape):
      ────────────────────────────────────────
      {
        "course": { 
          "code": "COMP 3413",
          "name": "Operating Systems",
          "semester": "Winter 2026",
          "professor_name": "Dr. Smith or null",
          "professor_email": "smith@uni.ca or null",
          "location": "Room 204 or null" 
        },
        "slots": [
          {
            "day": "Monday", 
            "start": "14:30", 
            "end": "15:45", 
            "type": "Lecture", 
            "location": "Room 204",
            "location_note": "Online via Zoom until Oct 1st or null" 
          }
        ],
        "assessments": [
          {
            "title": "Midterm Exam",
            "type": "midterm",
            "weight": 25,
            "due_date": "2026-02-20"
          }
        ],
        "reading_week_start": "2026-02-16 or null",
        "reading_week_end": "2026-02-20 or null",
        "variants": []
      }
    `;


        // 3. Call Gemini via Edge Function proxy (keeps API key server-side)
        const result = await callAiProxy('parse-pdf', { base64, prompt });

        if (result.error) {
            console.error('Gemini API Error:', result.error);
            return null;
        }

        // 4. Parse the Response
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('No data returned from Gemini.');
        }

        // Clean up markdown code blocks if present (Gemini sometimes adds ```json ... ```)
        const cleanedText = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        const courseData: ExtractedCourseData = JSON.parse(cleanedText);
        return courseData;

    } catch (error) {
        console.error('Extraction Failed:', error);
        return null;
    }
};
