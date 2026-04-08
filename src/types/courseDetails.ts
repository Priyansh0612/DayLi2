import { Database } from './supabase';

export type Assessment = Database['public']['Tables']['assessments']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type ClassSession = Database['public']['Tables']['classes']['Row'];

export interface MergedClassSession extends Omit<ClassSession, 'day_of_week'> {
    days: string[];
}

export interface FormSession {
    tempId: string;
    type: string;
    days: string[];
    startTime: Date;
    endTime: Date;
    location: string;
}
