import { TimeSlot } from '../services/availabilityEngine';

export interface DatedTimeSlot extends TimeSlot { 
    shift_date: string; 
}

export type Mode = 'shifts' | 'availability';
