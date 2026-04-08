import { Dimensions } from 'react-native';

// ─── UTILS ────────────────────────────────────────────────────────────────────
export const { width: SW, height: SH } = Dimensions.get('window');
export const PPM = 0.88;
export const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const timeStringToMins = (t: string): number => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const formatDateSafely = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const getSmartMonday = (offset = 0): Date => { const d = new Date(); const diff = d.getDay() === 0 ? -6 : 1 - d.getDay(); const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff + offset * 7); m.setHours(0, 0, 0, 0); return m; };
export const calcDateForDay = (ws: Date, day: string): string => formatDateSafely(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + DAYS_ORDER.indexOf(day)));
export const minsToDbTime = (m: number) => { const rm = m % 1440; return `${String(Math.floor(rm / 60)).padStart(2, '0')}:${String(rm % 60).padStart(2, '0')}:00`; };
export const cTime = (m: number) => { const rm = m % 1440; const h = Math.floor(rm / 60), mins = rm % 60, sfx = h >= 12 ? 'p' : 'a', dh = h % 12 || 12; return mins === 0 ? `${dh}${sfx}` : `${dh}:${String(mins).padStart(2, '0')}${sfx}`; };

// ─── DESIGN TOKENS — Deep Cobalt (Work) ─────────────────────────────
export const C = {
    canvas: '#F4F5F2',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEDE7',
    border: '#E8E4DC',
    borderMid: '#D0CBC2',
    ink: '#1A1916',
    inkMid: '#4A4540',
    muted: '#8A8278',
    ghost: '#B8B0A6',

    // Cobalt/Cyan — Work Accents
    shift: '#0284C7',
    shiftLight: 'rgba(2, 132, 199, 0.1)',
    shiftGlow: 'rgba(2, 132, 199, 0.25)',
    shiftGrad: ['#0369A1', '#06B6D4'] as const,

    // Emerald — Availability
    avail: '#059669',
    availLight: 'rgba(5, 150, 105, 0.1)',
    availGlow: 'rgba(5, 150, 105, 0.25)',
    availGrad: ['#047857', '#10B981'] as const,

    // Grid states
    busyBg: 'rgba(2, 132, 199, 0.04)',
    freeBg: 'rgba(16, 185, 129, 0.03)',
    pastBg: 'rgba(0, 0, 0, 0.02)',
    todayBg: 'rgba(2, 132, 199, 0.08)',
    classBg: 'rgba(99, 102, 241, 0.08)',
    classBorder: '#818CF8',
    classText: '#4338CA',
    danger: '#DC2626',
};

export const getColBg = (ds: string, hasShift: boolean, isPast: boolean, isToday: boolean) => {
    if (isToday) return C.todayBg;
    if (isPast) return C.pastBg;
    if (hasShift) return C.busyBg;
    return C.freeBg;
};
