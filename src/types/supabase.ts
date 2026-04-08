export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                    updated_at: string | null
                    diet_type: string | null
                    allergies: string[] | null
                    main_cuisine: string | null
                    secondary_cuisines: string[] | null
                    target_work_hours: number | null
                    commute_time_mins: number | null
                    preferred_shift_length: number | null
                    days_off: string[] | null
                    is_work_setup_complete: boolean | null
                }
                Insert: {
                    id: string
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    updated_at?: string | null
                    diet_type?: string | null
                    allergies?: string[] | null
                    main_cuisine?: string | null
                    secondary_cuisines?: string[] | null
                    target_work_hours?: number | null
                    commute_time_mins?: number | null
                    preferred_shift_length?: number | null
                    days_off?: string[] | null
                    is_work_setup_complete?: boolean | null
                }
                Update: {
                    id?: string
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    updated_at?: string | null
                    diet_type?: string | null
                    allergies?: string[] | null
                    main_cuisine?: string | null
                    secondary_cuisines?: string[] | null
                    target_work_hours?: number | null
                    commute_time_mins?: number | null
                    preferred_shift_length?: number | null
                    days_off?: string[] | null
                    is_work_setup_complete?: boolean | null
                }
            }
            courses: {
                Row: {
                    id: string
                    user_id: string
                    semester_id: string | null
                    code: string
                    name: string
                    description: string | null
                    color: string | null
                    created_at: string
                    professor_name: string | null
                    professor_email: string | null
                    outline_url: string | null
                    target_grade: number | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    semester_id?: string | null
                    code?: string
                    name?: string
                    description?: string | null
                    color?: string | null
                    created_at?: string
                    professor_name?: string | null
                    professor_email?: string | null
                    outline_url?: string | null
                    target_grade?: number | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    semester_id?: string | null
                    code?: string
                    name?: string
                    description?: string | null
                    color?: string | null
                    created_at?: string
                    professor_name?: string | null
                    professor_email?: string | null
                    outline_url?: string | null
                    target_grade?: number | null
                }
            }
            assessments: {
                Row: {
                    id: string
                    course_id: string
                    title: string
                    description: string | null
                    type: 'assignment' | 'quiz' | 'project' | 'midterm' | 'final' | 'lab' | 'discussion' | 'exam' | 'other'
                    weight: number
                    total_marks: number | null
                    my_score: number | null
                    due_date: string | null
                    is_completed: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    course_id: string
                    title: string
                    description?: string | null
                    type?: 'assignment' | 'quiz' | 'project' | 'midterm' | 'final' | 'lab' | 'discussion' | 'exam' | 'other'
                    weight?: number
                    total_marks?: number | null
                    my_score?: number | null
                    due_date?: string | null
                    is_completed?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    course_id?: string
                    title?: string
                    description?: string | null
                    type?: 'assignment' | 'quiz' | 'project' | 'midterm' | 'final' | 'lab' | 'discussion' | 'exam' | 'other'
                    weight?: number
                    total_marks?: number | null
                    my_score?: number | null
                    due_date?: string | null
                    is_completed?: boolean
                    created_at?: string
                }
            }
            classes: {
                Row: {
                    id: string
                    course_id: string
                    day_of_week: string
                    start_time: string
                    end_time: string
                    location: string | null
                    type: string
                    location_note: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    course_id: string
                    day_of_week: string
                    start_time: string
                    end_time: string
                    location?: string | null
                    type?: string
                    location_note?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    course_id?: string
                    day_of_week?: string
                    start_time?: string
                    end_time?: string
                    location?: string | null
                    type?: string
                    location_note?: string | null
                    created_at?: string
                }
            }
            work_shifts: {
                Row: {
                    id: string
                    user_id: string
                    day_of_week: string
                    start_time: string
                    end_time: string
                    is_generated: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    day_of_week: string
                    start_time: string
                    end_time: string
                    is_generated?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    day_of_week?: string
                    start_time?: string
                    end_time?: string
                    is_generated?: boolean
                    created_at?: string
                }
            }
        }
    }
}
