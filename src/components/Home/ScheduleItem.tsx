import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from './homeTokens';

// ─── Schedule Item ────────────────────────────────────────────
export type SchedType = 'academic' | 'meal' | 'work';

export const RAIL_COLORS: Record<SchedType, [string, string]> = {
    academic: ['#818cf8', '#6366f1'],
    meal: ['#e07f55', '#C4663A'],
    work: ['#38bdf8', '#0077B6'],
};
export const ICON_BG: Record<SchedType, string> = { academic: C.academicL, meal: C.mealL, work: C.workL };
export const ICON_BORDER: Record<SchedType, string> = { academic: C.academicM, meal: C.mealM, work: C.workM };
export const TIME_COLOR: Record<SchedType, string> = { academic: C.academic, meal: C.meal, work: C.work };

const ScheduleItem: React.FC<{
    type: SchedType; time: string; title: string; subtitle: string;
    past?: boolean; icon: React.ReactNode; isLast?: boolean;
    onPress?: () => void;
}> = ({ type, time, title, subtitle, past, icon, isLast, onPress }) => (
    <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        activeOpacity={0.7}
        style={{
            flexDirection: 'row', alignItems: 'stretch',
            opacity: past ? 0.42 : 1,
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: 'rgba(232,226,218,0.45)',
        }}
    >
        <LinearGradient colors={RAIL_COLORS[type]} style={{ width: 4 }} />
        <View style={{ width: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 }}>
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: ICON_BG[type], borderWidth: 1, borderColor: ICON_BORDER[type], alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </View>
        </View>
        <View style={{ flex: 1, paddingVertical: 13, paddingRight: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 3, color: TIME_COLOR[type] }} className="font-body-bold">{time}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink, lineHeight: 20, marginBottom: 2 }} className="font-body-bold">{title}</Text>
            <Text style={{ fontSize: 12, color: C.muted, fontWeight: '500' }} className="font-body">{subtitle}</Text>
        </View>
    </TouchableOpacity>
);

export default ScheduleItem;
