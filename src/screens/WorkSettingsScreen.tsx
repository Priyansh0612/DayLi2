import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, StatusBar, Alert, Switch
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../config/supabase';

// ─── DESIGN TOKENS (Matching WorksDashboard) ───
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

export default function WorkSettingsScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Preferences State
    const [targetHours, setTargetHours] = useState(15);
    const [commuteMins, setCommuteMins] = useState(30);
    const [daysOff, setDaysOff] = useState<string[]>([]);
    const [isIntl, setIsIntl] = useState(false);

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            // Pre-fill existing data
            if (profile) {
                setTargetHours(profile.target_work_hours || 15);
                setCommuteMins(profile.commute_time_mins || 30);
                setDaysOff(profile.days_off || []);
                setIsIntl(profile.is_international_student || false);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
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

            const { error } = await supabase.from('profiles').update({
                target_work_hours: targetHours,
                commute_time_mins: commuteMins,
                days_off: daysOff,
                is_international_student: isIntl
            }).eq('id', user.id);

            if (error) throw error;

            // Go back to the dashboard. The useFocusEffect there will automatically re-fetch and re-generate availability!
            navigation.goBack();
            
        } catch (error: any) {
            Alert.alert('Save Failed', error.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleDay = (day: string) => {
        setDaysOff(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: C.canvas, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={C.shift} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.canvas }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* ─── HEADER ─── */}
            <View style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: insets.top }}>
                <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, justifyContent: 'center' }}>
                        <ArrowLeft size={24} color={C.ink} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>Work Settings</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                
                {/* ─── STUDENT STATUS ─── */}
                <View style={{ backgroundColor: C.surface, padding: 20, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 4 }}>International Student</Text>
                            <Text style={{ fontSize: 12, color: C.muted, lineHeight: 18, paddingRight: 20 }}>
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
                                style={{ 
                                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
                                    padding: 16, borderBottomWidth: idx === DAYS_ORDER.length - 1 ? 0 : 1, borderBottomColor: C.border 
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
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 40 }}>
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

            </ScrollView>

            {/* ─── SAVE BUTTON ─── */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: 'rgba(244, 245, 242, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.88)' }}>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={{ width: '100%', height: 54, borderRadius: 27, shadowColor: C.shift, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 8 }}>
                    <LinearGradient colors={C.shiftGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 27 }}>
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }}>Save Preferences</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}
