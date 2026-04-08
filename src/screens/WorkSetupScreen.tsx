import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, StatusBar, Alert, Switch
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Briefcase, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../config/supabase';

// ─── DESIGN TOKENS (Matching WorksDashboard & WorkSettings) ───
const C = {
    canvas: '#F4F5F2',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEDE7',
    border: '#E8E4DC',
    ink: '#1A1916',
    inkMid: '#4A4540',
    muted: '#8A8278',
    shift: '#0284C7',
    shiftGrad: ['#0369A1', '#06B6D4'] as const,
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COMMUTE_OPTIONS = [15, 30, 45, 60];
const HOUR_OPTIONS = [10, 15, 20, 24, 30, 40];

export default function WorkSetupScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [saving, setSaving] = useState(false);

    // Initial Default State
    const [targetHours, setTargetHours] = useState(15);
    const [commuteMins, setCommuteMins] = useState(30);
    const [daysOff, setDaysOff] = useState<string[]>([]);
    const [isIntl, setIsIntl] = useState(false);

    const handleCompleteSetup = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Student Logic Validation
            if (isIntl && targetHours > 24) {
                Alert.alert("Rule Violation", "International students in Canada are currently capped at 24 hours per week.");
                setSaving(false);
                return;
            }

            // Save to Supabase Profiles Table
            const { error } = await supabase.from('profiles').update({
                target_work_hours: targetHours,
                commute_time_mins: commuteMins,
                days_off: daysOff,
                is_international_student: isIntl,
                is_work_setup_complete: true // 🟢 Corrected column name
            }).eq('id', user.id);

            if (error) throw error;

            // Navigate to the Dashboard!
            navigation.replace('WorksDashboard');
            
        } catch (error: any) {
            Alert.alert('Setup Failed', error.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleDay = (day: string) => {
        setDaysOff(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.canvas }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* ─── ONBOARDING HEADER ─── */}
            <View style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 10, paddingTop: insets.top }}>
                <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        style={{ zIndex: 2, marginBottom: 20 }}
                    >
                        <ArrowLeft size={26} color={C.ink} strokeWidth={2} />
                    </TouchableOpacity>

                    <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: `${C.shift}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Briefcase size={24} color={C.shift} />
                    </View>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -0.5, marginBottom: 8 }}>
                        Let's set up work.
                    </Text>
                    <Text style={{ fontSize: 15, color: C.muted, lineHeight: 22, fontWeight: '500' }}>
                        DayLi will automatically protect your classes and exams. Just tell us how much you want to work.
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                
                {/* ─── STUDENT STATUS ─── */}
                <View style={{ backgroundColor: C.surface, padding: 20, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 4 }}>International Student</Text>
                            <Text style={{ fontSize: 12, color: C.muted, lineHeight: 18, paddingRight: 20, fontWeight: '500' }}>
                                Enforces the Canadian 24-hour weekly limit for off-campus work.
                            </Text>
                        </View>
                        <Switch 
                            value={isIntl} 
                            onValueChange={(val) => {
                                setIsIntl(val);
                                if (val && targetHours > 24) setTargetHours(24);
                            }} 
                            trackColor={{ true: C.shift, false: C.surfaceAlt }}
                        />
                    </View>
                </View>

                {/* ─── TARGET HOURS ─── */}
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 }}>WEEKLY TARGET HOURS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                    {HOUR_OPTIONS.map(h => {
                        const isDisabled = isIntl && h > 24;
                        const isSelected = targetHours === h;
                        return (
                            <TouchableOpacity 
                                key={h} 
                                disabled={isDisabled}
                                onPress={() => setTargetHours(h)}
                                style={{ 
                                    width: '30%', height: 50, borderRadius: 14, 
                                    backgroundColor: isSelected ? C.shift : isDisabled ? C.border : C.surface, 
                                    borderWidth: 1, borderColor: isSelected ? C.shift : C.border,
                                    alignItems: 'center', justifyContent: 'center',
                                    opacity: isDisabled ? 0.5 : 1
                                }}
                            >
                                <Text style={{ fontWeight: '800', fontSize: 16, color: isSelected ? '#fff' : C.inkMid }}>{h}h</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ─── PREFERRED DAYS OFF ─── */}
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 }}>PREFERRED DAYS OFF</Text>
                <View style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 32 }}>
                    {DAYS_ORDER.map((day, idx) => {
                        const isSelected = daysOff.includes(day);
                        return (
                            <TouchableOpacity 
                                key={day}
                                onPress={() => toggleDay(day)}
                                activeOpacity={0.7}
                                style={{ 
                                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
                                    padding: 16, borderBottomWidth: idx === DAYS_ORDER.length - 1 ? 0 : 1, borderBottomColor: C.border,
                                    backgroundColor: isSelected ? `${C.shift}08` : C.surface
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: isSelected ? '700' : '500', color: isSelected ? C.shift : C.inkMid }}>{day}</Text>
                                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? C.shift : C.border, backgroundColor: isSelected ? C.shift : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                    {isSelected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ─── COMMUTE TIME ─── */}
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 }}>COMMUTE BUFFER</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    {COMMUTE_OPTIONS.map(m => {
                        const isSelected = commuteMins === m;
                        return (
                            <TouchableOpacity 
                                key={m} 
                                onPress={() => setCommuteMins(m)}
                                style={{ 
                                    flex: 1, height: 50, borderRadius: 14, 
                                    backgroundColor: isSelected ? C.shift : C.surface, 
                                    borderWidth: 1, borderColor: isSelected ? C.shift : C.border,
                                    alignItems: 'center', justifyContent: 'center' 
                                }}
                            >
                                <Text style={{ fontWeight: '800', fontSize: 15, color: isSelected ? '#fff' : C.inkMid }}>{m}m</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <Text style={{ fontSize: 12, color: C.muted, marginLeft: 4, fontWeight: '500' }}>Time blocked before and after classes to travel.</Text>

            </ScrollView>

            {/* ─── FINISH BUTTON ─── */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 24), backgroundColor: 'rgba(244, 245, 242, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.88)' }}>
                <TouchableOpacity onPress={handleCompleteSetup} disabled={saving} style={{ width: '100%', height: 56, borderRadius: 28, shadowColor: C.shift, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 6 }}>
                    <LinearGradient colors={C.shiftGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 28, gap: 8 }}>
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }}>Generate Availability</Text>
                                <ArrowRight size={20} color="#fff" strokeWidth={3} />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}
