import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
    FileUp, Briefcase, Utensils, Wallet,
    CheckCircle2, ArrowRight, Sparkles,
} from 'lucide-react-native';
import { C, titaniumCard } from './homeTokens';

// ─── FTUE COMPONENTS ───
export const OnboardingGreeting = ({ username }: { username: string | null }) => (
    <View style={{ marginBottom: 24 }}>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 34, color: C.primary, lineHeight: 38 }}>
            Welcome to DayLi, {username ? username.split(' ')[0] : 'there'}! 👋
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '500', color: C.muted, marginTop: 10, lineHeight: 22 }} className="font-body">
            Let's get your semester beautifully organized and your time optimized.
        </Text>
    </View>
);

export const SetupChecklist = ({
    hasCourses, hasWork, hasMeals, onAction
}: {
    hasCourses: boolean;
    hasWork: boolean;
    hasMeals: boolean;
    onAction: (type: 'syllabus' | 'work' | 'meal' | 'finance') => void
}) => (
    /* 🟠 Legacy Unused Code:
    const SetupChecklist = ({ onAction }: { onAction: (type: 'syllabus' | 'work' | 'meal' | 'finance') => void }) => (
    */
    <View style={[{ borderRadius: 26, padding: 22, overflow: 'hidden', marginBottom: 20 }, titaniumCard]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={18} color={C.academic} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: C.academic }} className="font-body-bold">
                Your Setup Journey
            </Text>
        </View>

        {[
            { id: 'syllabus', icon: FileUp, color: C.academic, title: 'Upload Syllabus', desc: 'AI extracts your deadlines instantly', completed: hasCourses },
            { id: 'work', icon: Briefcase, color: C.work, title: 'Set Work Hours', desc: 'Sync your shifts with your classes', completed: hasWork },
            { id: 'meal', icon: Utensils, color: C.meal, title: 'Meal Planner', desc: 'Plan your weekly fuel', completed: hasMeals },
            { id: 'finance', icon: Wallet, color: C.expense, title: 'Finance Setup', desc: 'Track your spending and budget', completed: false } // Finance always next for now
        ].map((item, idx, arr) => (
            <TouchableOpacity
                key={item.id}
                onPress={() => onAction(item.id as any)}
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
                    borderBottomWidth: idx === arr.length - 1 ? 0 : 1, borderBottomColor: 'rgba(232,226,218,0.45)',
                    opacity: item.completed ? 0.6 : 1
                }}
            >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: item.completed ? `${C.green}15` : `${item.color}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: item.completed ? `${C.green}30` : `${item.color}30` }}>
                    {item.completed ? (
                        <CheckCircle2 size={22} color={C.green} strokeWidth={2.2} />
                    ) : (
                        <item.icon size={22} color={item.color} strokeWidth={2.2} />
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 15, fontWeight: '700', color: C.ink }, item.completed && { textDecorationLine: 'line-through', opacity: 0.5 }]} className="font-body-bold">{item.title}</Text>
                    <Text style={{ fontSize: 13, color: C.muted, fontWeight: '500', marginTop: 1 }} className="font-body">{item.completed ? 'Success! Feature unlocked.' : item.desc}</Text>
                </View>
                {item.completed ? (
                    <CheckCircle2 size={18} color={C.green} strokeWidth={2.5} />
                ) : (
                    <ArrowRight size={18} color={C.ghost} strokeWidth={2.5} />
                )}
            </TouchableOpacity>
        ))}
    </View>
);

export const GhostDashboard = ({ isLoading = false }: { isLoading?: boolean }) => (
    <View style={{ marginTop: 10, paddingBottom: 20 }}>
        {/* 1. Ghost Timeline */}
        <View style={[{ borderRadius: 26, padding: 20, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.4)', opacity: 0.5 }, titaniumCard]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <View style={{ width: 50, height: 12, borderRadius: 6, backgroundColor: C.line }} />
                <View style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: C.line }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 50, height: 12, borderRadius: 6, backgroundColor: C.line }} />
                <View style={{ flex: 1, height: 60, borderRadius: 14, backgroundColor: C.line }} />
            </View>
        </View>

        {/* 2. Ghost Bento Cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={[{ flex: 1, borderRadius: 22, height: 170, backgroundColor: 'rgba(255,255,255,0.4)', opacity: 0.5 }, titaniumCard]} />
            <View style={[{ flex: 1, borderRadius: 22, height: 170, backgroundColor: 'rgba(255,255,255,0.4)', opacity: 0.5 }, titaniumCard]} />
        </View>
        <View style={[{ borderRadius: 26, height: 90, backgroundColor: 'rgba(255,255,255,0.4)', opacity: 0.5 }, titaniumCard]} />

        {/* Floating "Preview" Badge over the center */}
        {!isLoading && (
            <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted }} className="font-body-bold">Complete setup to unlock </Text>
                </View>
            </View>
        )}
    </View>
);
