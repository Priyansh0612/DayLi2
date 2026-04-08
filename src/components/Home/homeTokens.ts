// ─── Design Tokens ────────────────────────────────────────────
export const C = {
    canvas: '#FFFFFF',
    surface: '#FFFFFF',
    line: '#EBEBEB',
    tint: '#F2F2F0',
    primary: '#4A3B43',
    ink: '#1A1916',
    muted: '#7A6E68',
    ghost: '#B2A89E',
    academic: '#6366f1',
    academicL: 'rgba(99,102,241,0.10)',
    academicM: 'rgba(99,102,241,0.20)',
    meal: '#C4663A',
    mealL: 'rgba(196,102,58,0.10)',
    mealM: 'rgba(196,102,58,0.20)',
    work: '#0077B6',
    workL: 'rgba(0,119,182,0.10)',
    workM: 'rgba(0,119,182,0.20)',
    expense: '#2F5233',
    expenseL: 'rgba(47,82,51,0.10)',
    expenseM: 'rgba(47,82,51,0.20)',
    red: '#DC2626',
    amber: '#D97706',
    green: '#16a34a',
};

export const glass = { bg: 'rgba(255,255,255,0.60)', border: 'rgba(255,255,255,0.86)' };

export const titaniumCard = {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
};

// ─── Helpers ──────────────────────────────────────────────────
export const getFormattedDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

// 1. Put this helper ABOVE your HomeScreen component
export const calculateAcademicWeek = (termStart: string, readingWeekStart: string | null) => {
    // 🛡️ Normalize to midnight to avoid "off-by-one" day errors due to time of day
    const start = new Date(termStart);
    start.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffInDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    let currentWeek = Math.floor(diffInDays / 7) + 1;

    if (readingWeekStart) {
        const rw = new Date(readingWeekStart);
        rw.setHours(0, 0, 0, 0);
        if (today >= rw) currentWeek -= 1;
    }

    return currentWeek > 0 ? currentWeek : 1;
};

export const formatTo12h = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;

    try {
        const [hStr, mStr] = timeStr.split(':');
        const h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
        return timeStr;
    }
};

/**
 * 🛡️ CONSOLIDATED DATE ENGINE (2026)
 * Generates a YYYY-MM-DD string for the Monday of the week containing the given date.
 * Strictly uses local time getters to avoid the "8pm UTC Shift" bug.
 */
export const getWeekStartString = (date: Date) => {
    const dayOfWeek = date.getDay();
    // Monday is 1. Sunday is 0. 
    // If it's Sunday (0), we need to go back 6 days to get to Monday.
    // Otherwise, we go back (dayOfWeek - 1) days.
    const diffToMonday = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diffToMonday);

    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
};
