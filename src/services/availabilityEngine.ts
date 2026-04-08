export interface ClassSchedule {
    dayOfWeek: string;
    startTime: number;
    endTime: number;
    courseCode?: string;
    location?: string;
    displayTime?: string;
}

export interface WorkPreferences {
    targetHours: number;
    commuteMins: number;
    shiftLengthMins: number;
    daysOff: string[];
    maxHoursPerDay?: number;
    isInternationalStudent: boolean;
}

export interface TimeSlot {
    day: string;
    start: number;
    end: number;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
}

export const validateTargetHours = (prefs: WorkPreferences): ValidationResult => {

    // 1. The Legal Firewall (International Students)
    if (prefs.isInternationalStudent && prefs.targetHours > 24) {
        return {
            isValid: false,
            error: "Legal Limit Exceeded: International students are legally capped at 24 hours per week during academic sessions. Please lower your target hours."
        };
    }

    // 2. The Academic Burnout Check (Domestic Students)
    // Studies show working more than 20-25 hours severely impacts full-time study.
    if (!prefs.isInternationalStudent) {
        if (prefs.targetHours > 40) {
            return {
                isValid: false,
                error: "Critical Alert: Working more than 40 hours a week while studying full-time is highly correlated with academic failure and severe burnout. Please lower your target hours."
            };
        } else if (prefs.targetHours >= 30) {
            return {
                isValid: true, // It's legal, so we allow it to generate
                warning: "Burnout Alert: Working 30+ hours a week while studying full-time can significantly impact your grades and mental health. Make sure you are leaving enough time for assignments and rest!"
            };
        }
    }

    // 3. All good!
    return { isValid: true };
};

const CONFIG = {
    dayStart: 6 * 60,
    dayEnd: 24 * 60,
    minShift: 3 * 60, // 4 hours
    maxShift: 8 * 60, // 8 hours
    snapGrid: 15
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];



const snapStartUP = (time: number): number => {
    return Math.ceil(time / CONFIG.snapGrid) * CONFIG.snapGrid;
};

const snapEndDOWN = (time: number): number => {
    return Math.floor(time / CONFIG.snapGrid) * CONFIG.snapGrid;
};

const getMergedBusyBlocks = (classes: ClassSchedule[], day: string, commuteMins: number) => {
    let busyBlocks: { start: number, end: number }[] = [];
    const dayClasses = classes.filter(c => c.dayOfWeek === day);

    dayClasses.forEach(c => {
        busyBlocks.push({
            start: c.startTime - commuteMins,
            end: c.endTime + commuteMins
        });
    });
    busyBlocks.sort((a, b) => a.start - b.start);

    const mergedBlocks: { start: number, end: number }[] = [];
    if (busyBlocks.length > 0) {
        mergedBlocks.push({ ...busyBlocks[0] });
        for (let i = 1; i < busyBlocks.length; i++) {
            const prev = mergedBlocks[mergedBlocks.length - 1];
            const curr = busyBlocks[i];
            if (curr.start <= prev.end) {
                prev.end = Math.max(prev.end, curr.end);
            } else {
                mergedBlocks.push({ ...curr });
            }
        }
    }
    return mergedBlocks;
};

const getFreeGaps = (mergedBlocks: { start: number, end: number }[]) => {
    const freeGaps: { start: number, end: number }[] = [];
    let currentDayTime = CONFIG.dayStart;

    for (const block of mergedBlocks) {
        if (block.start > currentDayTime) {
            // Safely snap the boundaries AWAY from the classes
            const safeStart = snapStartUP(currentDayTime);
            const safeEnd = snapEndDOWN(block.start);

            if (safeEnd - safeStart >= CONFIG.minShift) {
                freeGaps.push({ start: safeStart, end: safeEnd });
            }
        }
        currentDayTime = Math.max(currentDayTime, block.end);
    }

    if (CONFIG.dayEnd > currentDayTime) {
        const safeStart = snapStartUP(currentDayTime);
        const safeEnd = snapEndDOWN(CONFIG.dayEnd);
        if (safeEnd - safeStart >= CONFIG.minShift) {
            freeGaps.push({ start: safeStart, end: safeEnd });
        }
    }
    return freeGaps;
};

export const generateAvailability = (
    classes: ClassSchedule[],
    prefs: WorkPreferences
): TimeSlot[] => {

    const finalAvailability: TimeSlot[] = [];

    // 1. Loop through every day of the week
    for (const day of DAYS_OF_WEEK) {

        // 2. CRITICAL: Respect their requested Days Off (e.g., Sunday)
        if (prefs.daysOff.includes(day)) continue;

        // 3. Find their class blocks and add the commute buffer
        const busyBlocks = getMergedBusyBlocks(classes, day, prefs.commuteMins);

        // 4. Find the remaining safe, 15-minute snapped free time
        const freeGaps = getFreeGaps(busyBlocks);

        // 5. Add these massive "envelopes" to the final form
        freeGaps.forEach(gap => {
            const gapDuration = gap.end - gap.start;

            // Only offer this window to the manager if it's long enough for a real shift (e.g., 4+ hours)
            if (gapDuration >= CONFIG.minShift) {
                finalAvailability.push({
                    day: day,
                    start: gap.start,
                    end: gap.end
                });
            }
        });
    }

    return finalAvailability;
};

export const minsToTimeStr = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMins = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMins} ${ampm}`;
};
