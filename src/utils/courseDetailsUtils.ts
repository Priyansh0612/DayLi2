import { MergedClassSession, ClassSession } from '../types/courseDetails';

export const THEMES: any[] = [
    { primary: "#7D739C", deep: "#60587A", light: "#A8A0C2", bg: "#F5F4F7", text: "#2D283E", border: "#EBE9F2", glow: "rgba(125,115,156,0.2)" }, // Lavender Gray
    { primary: "#65967B", deep: "#4E7761", light: "#98C0A9", bg: "#F2F7F4", text: "#1C3326", border: "#E5EFEA", glow: "rgba(101,150,123,0.2)" }, // Soft Sage
    { primary: "#CF8F5A", deep: "#AA7243", light: "#E6B485", bg: "#FAF4EF", text: "#4A2E15", border: "#F5E6DA", glow: "rgba(207,143,90,0.2)" },  // Warm Sand
    { primary: "#C27780", deep: "#9D5C63", light: "#DDA1A8", bg: "#FAF0F1", text: "#4A252A", border: "#F5E1E3", glow: "rgba(194,119,128,0.2)" }, // Dusty Rose
    { primary: "#639CBE", deep: "#487898", light: "#9CC4DB", bg: "#F0F6FA", text: "#1A3242", border: "#E1EDF5", glow: "rgba(99,156,190,0.2)" },  // Powder Blue
    { primary: "#5C7C8A", deep: "#4A6572", light: "#8DAAB8", bg: "#F0F4F8", text: "#1F2937", border: "#E2E8F0", glow: "rgba(92,124,138,0.2)" },  // Steel Slate
];

export const MUTED = "#64748B";

export const getTheme = (code?: string | null, storedColor?: string | null) => {
    if (storedColor) {
        const matchedTheme = THEMES.find(t => t.primary.toLowerCase() === storedColor.toLowerCase());
        if (matchedTheme) return matchedTheme;
    }
    if (!code) return THEMES[0];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x21f0aaad);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x735a2d97);
    hash ^= hash >>> 15;
    const index = Math.abs(hash) % THEMES.length;
    return THEMES[index];
};

export const DAY_ORDER: { [key: string]: number } = {
    "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7
};

export const TYPE_ORDER: { [key: string]: number } = {
    "lecture": 1, "tutorial": 2, "lab": 3, "seminar": 4, "office hour": 5
};

export const formatTime12Hour = (time24: string) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export const timeStringToMins = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

export const minsToTimeStr = (m: number) => {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    const sfx = h >= 12 ? 'PM' : 'AM';
    const dh = h % 12 || 12;
    return `${dh}:${String(mins).padStart(2, '0')} ${sfx}`;
};

export const toDBTime = (d: Date) => {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
};

export const gradeColor = (pct: number) => pct >= 80 ? "#10B981" : pct >= 65 ? "#F97316" : "#F43F5E";

export const processClasses = (rawClasses: ClassSession[]): MergedClassSession[] => {
    const groups: { [key: string]: MergedClassSession } = {};

    rawClasses.forEach(c => {
        const key = `${c.start_time}-${c.end_time}-${(c.type || 'class').toLowerCase()}-${c.location || ''}-${c.location_note || ''}`;
        if (!groups[key]) {
            groups[key] = { ...c, days: [c.day_of_week] };
        } else {
            if (!groups[key].days.includes(c.day_of_week)) {
                groups[key].days.push(c.day_of_week);
            }
        }
    });

    return Object.values(groups).sort((a, b) => {
        const typeA = TYPE_ORDER[(a.type || '').toLowerCase()] || 99;
        const typeB = TYPE_ORDER[(b.type || '').toLowerCase()] || 99;
        if (typeA !== typeB) return typeA - typeB;
        const dayA = Math.min(...a.days.map(d => DAY_ORDER[d] || 99));
        const dayB = Math.min(...b.days.map(d => DAY_ORDER[d] || 99));
        if (dayA !== dayB) return dayA - dayB;
        return a.start_time.localeCompare(b.start_time);
    }).map(group => ({
        ...group,
        days: group.days.sort((d1, d2) => (DAY_ORDER[d1] || 99) - (DAY_ORDER[d2] || 99))
    }));
};
