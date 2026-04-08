import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { Database } from '../types/supabase';
import { ExtractedCourseData } from '../utils/aiService';

type Course = Database['public']['Tables']['courses']['Row'] & {
    classes?: Database['public']['Tables']['classes']['Row'][];
    assessments?: Database['public']['Tables']['assessments']['Row'][];
};

export const useCourses = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const isFetching = useRef(false);

    const fetchCourses = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        setLoading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error("No user found");
            setUser(authUser);

            const { data, error } = await supabase
                .from('courses')
                .select('*, classes(*), assessments(*)')
                .eq('user_id', authUser.id)
                .order('code');

            if (error) throw error;
            setCourses(data || []);
        } catch (error: any) {
            console.error("Error fetching courses:", error.message);
        } finally {
            isFetching.current = false;
            setLoading(false);
        }
    }, []);

    const saveCourseToSupabase = async (
        extractedData: ExtractedCourseData,
        assessmentsToSave: any[],
        publicUrl: string,
        variantName: string | null = null,
        selectedCode: string | null = null
    ) => {
        try {
            const currentUser = user || (await supabase.auth.getUser()).data.user;
            if (!currentUser) throw new Error("User session invalid.");

            // --- 🚀 NEW: COMMUNITY READING WEEK UPDATE START ---
            // If the AI found reading week dates in the syllabus
            if (extractedData.reading_week_start && extractedData.reading_week_end) {

                // 1. Get the user's current term info
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('current_term_id, academic_terms(reading_week_start)')
                    .eq('id', currentUser.id)
                    .single();

                // 2. If the global table is missing the reading week, patch it!
                if (profile?.current_term_id && (profile.academic_terms as any)?.reading_week_start === null) {
                    await supabase
                        .from('academic_terms')
                        .update({
                            reading_week_start: extractedData.reading_week_start,
                            reading_week_end: extractedData.reading_week_end
                        })
                        .eq('id', profile.current_term_id);
                }
            }
            // --- 🚀 NEW: COMMUNITY READING WEEK UPDATE END ---

            // 1. Determine Code
            const finalCode = selectedCode || extractedData.course.code || "UNKNOWN";

            // 2. Get or Create Semester
            let semesterId;
            const { data: semesters } = await supabase.from('semesters').select('id').limit(1);

            if (semesters && semesters.length > 0) {
                semesterId = semesters[0].id;
            } else {
                const { data: newSem, error: semError } = await supabase
                    .from('semesters')
                    .insert({ user_id: currentUser.id, name: extractedData.course.semester || 'Winter 2026', is_current: true })
                    .select()
                    .single();
                if (semError) throw semError;
                semesterId = newSem.id;
            }

            // 3. Check for EXISTING Course (fuzzy match to catch variants like COMP-4434 vs COMP-4434-WA)
            const { data: userCourses } = await supabase
                .from('courses')
                .select('id, code')
                .eq('user_id', currentUser.id);

            // Extract the base code (e.g., "COMP 4434" from "COMP-4434-WA" or "COMP 4434")
            const normalizeCode = (c: string) => c.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
            const baseCode = normalizeCode(finalCode).split(' ').slice(0, 2).join(' '); // e.g., "COMP 4434"

            const existingCourse = (userCourses || []).find(c => {
                const existingBase = normalizeCode(c.code).split(' ').slice(0, 2).join(' ');
                return existingBase === baseCode;
            });

            let courseId = null;

            if (existingCourse) {
                courseId = existingCourse.id;
                await supabase.from('courses').update({ outline_url: publicUrl }).eq('id', courseId);
            } else {
                const { data: newCourse, error: createError } = await supabase
                    .from('courses')
                    .insert({
                        user_id: currentUser.id,
                        semester_id: semesterId,
                        code: finalCode,
                        name: extractedData.course.name || "Unnamed Course",
                        professor_name: extractedData.course.professor_name || null,
                        professor_email: extractedData.course.professor_email || null,
                        color: '#3B82F6',
                        outline_url: publicUrl,
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                if (!newCourse) throw new Error("Database returned null for new course.");
                courseId = newCourse.id;
            }

            // 4. Insert Class Slots
            await supabase.from('classes').delete().eq('course_id', courseId);

            if (extractedData.slots && extractedData.slots.length > 0) {
                let slotsToInsert = extractedData.slots;
                // Filter based on variant
                if (variantName) {
                    const vName = variantName.toLowerCase();
                    if (vName.includes('no lab') || vName.includes('without lab') || vName.includes('lecture only')) {
                        slotsToInsert = slotsToInsert.filter(s => s.type.toLowerCase() !== 'lab');
                    }
                }

                const classesToInsert = slotsToInsert.map(slot => ({
                    course_id: courseId,
                    day_of_week: slot.day,
                    start_time: slot.start,
                    end_time: slot.end,
                    location: slot.location,
                    location_note: slot.location_note,
                    type: slot.type
                }));

                if (classesToInsert.length > 0) {
                    const { error: classError } = await supabase.from('classes').insert(classesToInsert);
                    if (classError) throw classError;
                }
            }

            // 5. Insert Assessments
            await supabase.from('assessments').delete().eq('course_id', courseId);

            if (assessmentsToSave && assessmentsToSave.length > 0) {
                const sanitizedAssessments: any[] = [];

                assessmentsToSave.forEach((item: any) => {
                    // Split Dates Logic
                    if (item.due_date && item.due_date.includes(',')) {
                        const dates = item.due_date.split(',').map((d: string) => d.trim());
                        const totalWeight = parseFloat(item.weight?.toString() || '0');
                        const splitWeight = totalWeight > 0 ? (totalWeight / dates.length) : 0;

                        dates.forEach((dateStr: string, index: number) => {
                            let isoDate = null;
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) {
                                d.setUTCHours(12, 0, 0, 0); // Noon
                                isoDate = d.toISOString();
                            }

                            sanitizedAssessments.push({
                                course_id: courseId,
                                title: `${item.title} ${index + 1}`,
                                type: (item.type || 'assignment').toLowerCase(),
                                weight: splitWeight,
                                total_marks: 100,
                                due_date: isoDate,
                                is_completed: false
                            });
                        });
                    } else {
                        let isoDate = null;
                        if (item.due_date) {
                            const d = new Date(item.due_date);
                            if (!isNaN(d.getTime())) {
                                d.setUTCHours(12, 0, 0, 0); // Noon
                                isoDate = d.toISOString();
                            }
                        }

                        sanitizedAssessments.push({
                            course_id: courseId,
                            title: item.title,
                            type: (item.type || 'assignment').toLowerCase(),
                            weight: parseFloat(item.weight?.toString() || '0'),
                            total_marks: 100,
                            due_date: isoDate,
                            is_completed: false
                        });
                    }
                });

                if (sanitizedAssessments.length > 0) {
                    const { error: assessError } = await supabase.from('assessments').insert(sanitizedAssessments);
                    if (assessError) throw assessError;
                }
            }

            // Refresh list
            fetchCourses();
            return true;
        } catch (error: any) {
            console.error("Error Saving Course:", error);
            throw error;
        }
    };

    return {
        courses,
        loading,
        uploading,
        user,
        setUploading,
        fetchCourses,
        saveCourseToSupabase
    };
};
