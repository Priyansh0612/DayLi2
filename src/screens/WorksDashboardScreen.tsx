import React, { useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
    StatusBar, Dimensions, Platform, Animated, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Settings, Copy, Plus } from 'lucide-react-native';

import { SkeletonBox } from '../components/SkeletonLoaders';
import { ShiftEditor } from '../components/Works/ShiftEditor';
import { useWorksDashboard } from '../hooks/useWorksDashboard';
import { Mode, DatedTimeSlot } from '../types/worksDashboard';
import { SW, SH, PPM, DAYS_ORDER, C, formatDateSafely, getSmartMonday, cTime, getColBg } from '../utils/worksDashboardUtils';

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function WorksDashboardScreen() {
    const navigation = useNavigation<any>();
    const {
        loading,
        isSaving,
        isSuccess,
        setIsSuccess,
        mode,
        setMode,
        classesList,
        preferences,
        schedule,
        setSchedule,
        existingShifts,
        setExistingShifts,
        availBlocks,
        setAvailBlocks,
        examList,
        editingIndex,
        setEditingIndex,
        editDates,
        setEditDates,
        editStart,
        setEditStart,
        editEnd,
        setEditEnd,
        weekStart,
        toggleEditDate,
        handleAdd,
        handleSaveEdit,
        handleDelete,
        handleCopy,
        handleSaveShifts,
        handleExportAvailability
    } = useWorksDashboard();

    // --- Dynamic Rendering Variables ---
    const accent = mode === 'shifts' ? C.shift : C.avail;
    const accentGrad = mode === 'shifts' ? C.shiftGrad : C.availGrad;
    const accentGlow = mode === 'shifts' ? C.shiftGlow : C.availGlow;
    const todayStr = formatDateSafely(new Date());

    // Calculations for the Glass Hero
    const targetHours = preferences?.targetHours || 15;
    const MON = getSmartMonday(0);
    const w1end = formatDateSafely(new Date(MON.getFullYear(), MON.getMonth(), MON.getDate() + 6));
    const w1 = schedule.filter((s: DatedTimeSlot) => s.shift_date >= formatDateSafely(MON) && s.shift_date <= w1end);
    const w1Mins = w1.reduce((s: number, x: DatedTimeSlot) => s + (x.end - x.start), 0);
    const w1Hrs = w1Mins / 60;

    const pct = Math.min(w1Hrs / targetHours, 1);
    const status = w1Hrs >= targetHours ? 'On Target ✓' : w1Hrs >= targetHours * 0.75 ? 'Almost there' : 'Building…';
    const statusColor = w1Hrs >= targetHours ? C.avail : w1Hrs >= targetHours * 0.75 ? '#F59E0B' : '#0EA5E9';

    const totalHrs = (schedule.reduce((a: number, x: DatedTimeSlot) => a + (x.end - x.start), 0) / 60).toFixed(1);
    const w2Hrs = (schedule.filter((s: DatedTimeSlot) => s.shift_date > w1end).reduce((a: number, x: DatedTimeSlot) => a + (x.end - x.start), 0) / 60).toFixed(1);

    // Mode Toggle Animation
    const animX = useRef(new Animated.Value(mode === 'shifts' ? 0 : 1)).current;
    useEffect(() => { Animated.spring(animX, { toValue: mode === 'shifts' ? 0 : 1, tension: 180, friction: 22, useNativeDriver: true }).start(); }, [mode]);
    const PILL_W = (SW - 40 - 8) / 2;
    const translateX = animX.interpolate({ inputRange: [0, 1], outputRange: [0, PILL_W] });

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0B1120' }}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <SafeAreaView style={{ flex: 1 }}>
                    {/* Skeleton Header */}
                    <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 6, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <SkeletonBox width={26} height={26} borderRadius={6} color="rgba(255,255,255,0.1)" />
                        <SkeletonBox width={70} height={14} borderRadius={5} color="rgba(255,255,255,0.1)" />
                        <SkeletonBox width={36} height={36} borderRadius={18} color="rgba(255,255,255,0.1)" />
                    </View>
                    {/* Skeleton Toggle */}
                    <View style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 10 }}>
                        <SkeletonBox width="100%" height={38} borderRadius={14} color="rgba(255,255,255,0.08)" />
                    </View>
                    {/* Skeleton Glass Card */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                        <View style={{ borderRadius: 24, padding: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <View>
                                    <SkeletonBox width={80} height={10} borderRadius={4} color="rgba(255,255,255,0.1)" style={{ marginBottom: 6 }} />
                                    <SkeletonBox width={60} height={8} borderRadius={3} color="rgba(255,255,255,0.08)" />
                                </View>
                                <SkeletonBox width={100} height={44} borderRadius={8} color="rgba(255,255,255,0.1)" />
                            </View>
                            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <SkeletonBox width={40} height={8} borderRadius={3} color="rgba(255,255,255,0.08)" style={{ marginBottom: 4 }} />
                                    <SkeletonBox width={35} height={14} borderRadius={5} color="rgba(255,255,255,0.1)" />
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <SkeletonBox width={35} height={8} borderRadius={3} color="rgba(255,255,255,0.08)" style={{ marginBottom: 4 }} />
                                    <SkeletonBox width={35} height={14} borderRadius={5} color="rgba(255,255,255,0.1)" />
                                </View>
                            </View>
                        </View>
                    </View>
                    {/* Skeleton Grid */}
                    <View style={{ flex: 1, backgroundColor: C.canvas, overflow: 'hidden' }}>
                        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, height: 44, paddingLeft: 38 }}>
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <View key={i} style={{ width: 58, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: C.border }}>
                                    <SkeletonBox width={24} height={8} borderRadius={3} color="#E0DBD2" style={{ marginBottom: 4 }} />
                                    <SkeletonBox width={20} height={20} borderRadius={10} color="#E0DBD2" />
                                </View>
                            ))}
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            <View style={{ width: 38, borderRightWidth: 1, borderRightColor: C.border }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <View key={i} style={{ height: 53, alignItems: 'flex-end', paddingTop: 4, paddingRight: 5 }}>
                                        <SkeletonBox width={18} height={8} borderRadius={3} color="#E0DBD2" />
                                    </View>
                                ))}
                            </View>
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <View key={i} style={{ width: 58, borderRightWidth: 1, borderRightColor: '#E8E4DC40' }}>
                                    {i % 3 === 0 && <SkeletonBox width={52} height={55} borderRadius={10} color="rgba(2,132,199,0.08)" style={{ marginTop: i === 3 ? 80 : 160, marginLeft: 3 }} />}
                                </View>
                            ))}
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.canvas }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ─── THE GLASS HERO (Deep Cobalt Background) ─── */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SH * 0.50, backgroundColor: '#0B1120' }}>
                <LinearGradient
                    colors={mode === 'shifts' ? ['rgba(2, 132, 199, 0.25)', 'rgba(2, 132, 199, 0.08)', 'transparent'] : ['rgba(5, 150, 105, 0.25)', 'rgba(5, 150, 105, 0.08)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
            </View>

            {/* ─── HEADER CONTROLS ─── */}
            <SafeAreaView style={{ zIndex: 10 }}>
                <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 6, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                    >
                        <ArrowLeft size={26} color="#fff" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* ── DayLi Brand Lockup: WORK ── */}
                    <View style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1
                    }} pointerEvents="none">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{
                                color: mode === 'shifts' ? '#7DD3FC' : '#10B981',
                                fontWeight: '900',
                                fontSize: 13,
                                letterSpacing: 1.5,
                                textTransform: 'uppercase'
                            }}>
                                Work
                            </Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', zIndex: 2 }}>
                        {/* ✨ REPLACED COPY WITH SETTINGS */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('WorkSettings')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Settings size={22} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAdd} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', shadowColor: accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}>
                            <Plus size={18} color="#fff" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── MODE TOGGLE ─── */}
                <View style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                        <Animated.View style={{ position: 'absolute', top: 3, left: 3, height: 32, width: PILL_W, borderRadius: 11, transform: [{ translateX }], shadowColor: accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, overflow: 'hidden' }}>
                            <LinearGradient colors={accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                        </Animated.View>
                        {(['shifts', 'availability'] as Mode[]).map(m => (
                            <TouchableOpacity
                                key={m}
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (mode === m) return;

                                    if (mode === 'shifts') setExistingShifts(schedule);
                                    if (mode === 'availability') setAvailBlocks(schedule);

                                    setMode(m);
                                    setIsSuccess(false);

                                    if (m === 'shifts') setSchedule(existingShifts);
                                    if (m === 'availability') setSchedule(availBlocks);
                                }}
                                style={{ flex: 1, height: 32, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ fontWeight: '700', fontSize: 11, letterSpacing: 1, color: mode === m ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                                    {m === 'shifts' ? 'My Shifts' : 'Availability'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ─── COMPACT GLASS HERO ─── */}
                <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                    <BlurView intensity={50} tint="dark" style={{ borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                        {/* Top row: Status + Hours */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
                                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                                        {status}
                                    </Text>
                                </View>
                                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                    This Week
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={{ color: '#fff', fontSize: 44, fontWeight: '300', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
                                    {w1Hrs.toFixed(1)}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, fontWeight: '500', marginLeft: 3 }}>
                                    / {targetHours}h
                                </Text>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 12 }} />

                        {/* Bottom row: Week 2 + Total */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Week 2</Text>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{w2Hrs}h</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Total</Text>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{totalHrs}h</Text>
                            </View>
                        </View>
                    </BlurView>
                </View>
            </SafeAreaView>

            {/* ─── THE SCHEDULE GRID ─── */}
            <View style={{ flex: 1, backgroundColor: C.canvas, overflow: 'hidden', paddingBottom: !isSuccess ? 90 : 0 }}>
                <View style={{ flexDirection: 'row', flex: 1, paddingTop: 16 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} contentContainerStyle={{ flexDirection: 'column' }} nestedScrollEnabled={true}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            {/* TIME GUTTER */}
                            <View style={{ width: 38, borderRightWidth: 1, borderRightColor: C.border, backgroundColor: C.surface, zIndex: 20 }}>
                                <View style={{ height: 62, borderBottomWidth: 1, borderBottomColor: C.border }} />
                            </View>
                            {/* HEADER & WEEK BARS */}
                            <View style={{ flexDirection: 'column' }}>
                                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, height: 44, zIndex: 10 }}>
                                    {Array.from({ length: 14 }).map((_, i) => {
                                        const x = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
                                        const ds = formatDateSafely(x), name = DAYS_ORDER[x.getDay() === 0 ? 6 : x.getDay() - 1];
                                        const isToday = ds === todayStr, isWk2 = i === 7, hasShift = schedule.some(s => s.shift_date === ds), isPast = ds < todayStr;
                                        return (
                                            <View key={ds} style={{ width: 58, height: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: C.border, borderLeftWidth: isWk2 ? 2 : 0, borderLeftColor: `${accent}50`, backgroundColor: isToday ? `${accent}0E` : C.surface }}>
                                                <Text style={{ color: isToday ? accent : C.muted, fontWeight: '800', fontSize: 9, letterSpacing: 1.5 }}>{name.slice(0, 3).toUpperCase()}</Text>
                                                <View style={{ marginTop: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: isToday ? accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ color: isToday ? '#fff' : isPast ? C.ghost : C.inkMid, fontWeight: isToday ? '800' : '600', fontSize: 10 }}>{x.getDate()}</Text>
                                                </View>
                                                {hasShift && !isToday && <View style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: accent, opacity: 0.6 }} />}
                                            </View>
                                        );
                                    })}
                                </View>
                                <View style={{ flexDirection: 'row', height: 18, borderBottomWidth: 1, borderBottomColor: C.border }}>
                                    {[0, 7].map(st => (
                                        <View key={st} style={{ width: 58 * 7, alignItems: 'center', flexDirection: 'row', paddingLeft: 10, backgroundColor: st === 7 ? `${accent}06` : C.surfaceAlt, borderLeftWidth: st === 7 ? 2 : 0, borderLeftColor: `${accent}50` }}>
                                            <Text style={{ fontSize: 8, fontWeight: '800', letterSpacing: 2.5, color: accent, textTransform: 'uppercase', opacity: st === 7 ? 0.9 : 0.65 }}>{st === 7 ? '— WEEK 2' : 'WEEK 1'}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* MAIN GRID BODY */}
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled={true}>
                            <View style={{ flexDirection: 'row', position: 'relative', height: 24 * 60 * PPM }}>
                                <View style={{ width: 38, borderRightWidth: 1, borderRightColor: C.border, backgroundColor: C.surface, zIndex: 20 }}>
                                    {Array.from({ length: 24 }).map((_, i) => {
                                        const h = 5 + i, raw_h = h % 24, lbl = raw_h === 0 ? 12 : raw_h > 12 ? raw_h - 12 : raw_h, sfx = h >= 12 && h < 24 ? 'p' : 'a';
                                        return (
                                            <View key={i} style={{ height: 60 * PPM, alignItems: 'flex-end', paddingTop: 2, paddingRight: 5 }}>
                                                <Text style={{ fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.2 }}>{lbl}{sfx}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                                <View style={{ position: 'absolute', left: 38, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
                                    {Array.from({ length: 24 }).map((_, i) => <View key={i} style={{ height: 60 * PPM, borderTopWidth: 1, borderTopColor: C.border }} />)}
                                </View>
                                {Array.from({ length: 14 }).map((_, i) => {
                                    const x = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
                                    const ds = formatDateSafely(x), name = DAYS_ORDER[x.getDay() === 0 ? 6 : x.getDay() - 1];
                                    const isPast = ds < todayStr, isToday = ds === todayStr, isWk2 = i === 7;
                                    const colShifts = schedule.filter(s => s.shift_date === ds), hasShift = colShifts.length > 0;
                                    return (
                                        <TouchableOpacity key={ds} activeOpacity={1} onPress={() => { if (isPast || hasShift) return; setEditDates([ds]); setEditStart(12 * 60); setEditEnd(16 * 60); setEditingIndex(-1); }} style={{ width: 58, position: 'relative', borderRightWidth: 1, borderRightColor: `${C.border}60`, borderLeftWidth: isWk2 ? 2 : 0, borderLeftColor: `${accent}50`, opacity: isPast ? 0.38 : 1, backgroundColor: getColBg(ds, hasShift, isPast, isToday) }}>
                                            {isToday && <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2.5, backgroundColor: `${accent}50`, zIndex: 1 }} />}
                                            {!hasShift && !isPast && !isToday && <Text style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -4 }, { translateY: -6 }], opacity: 0.18, fontSize: 11, color: C.avail, fontWeight: '800' }}>+</Text>}

                                            {/* ✨ BLANKET TINT: Handles exams that DON'T match a specific class block */}
                                            {examList.filter(ex => ex.date === ds).map((ex, idx) => {
                                                const matchesAClass = classesList.some(c => c.dayOfWeek === name && c.courseCode === ex.courseCode);
                                                if (matchesAClass) return null;

                                                return (
                                                    <View key={idx} style={{
                                                        position: 'absolute',
                                                        top: 0, bottom: 0, left: 0, right: 0,
                                                        backgroundColor: 'rgba(220, 38, 38, 0.08)',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        zIndex: 5,
                                                        pointerEvents: 'none'
                                                    }}>
                                                        <View style={{ transform: [{ rotate: '-90deg' }] }}>
                                                            <Text style={{ color: C.danger, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>
                                                                {ex.courseCode}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                );
                                            })}

                                            {classesList.filter(c => c.dayOfWeek === name).map((cls, idx) => {
                                                const hasExamToday = examList.some(ex => ex.date === ds && ex.courseCode === cls.courseCode);
                                                const clsH = Math.max((cls.endTime - cls.startTime) * PPM, 22);

                                                return (
                                                    <View key={idx} style={{
                                                        position: 'absolute',
                                                        top: (cls.startTime - 5 * 60) * PPM,
                                                        height: clsH,
                                                        left: 2, right: 2,
                                                        zIndex: 10,
                                                        backgroundColor: hasExamToday ? `${C.danger}15` : C.classBg,
                                                        borderRadius: 8,
                                                        borderLeftWidth: 3,
                                                        borderLeftColor: hasExamToday ? C.danger : C.classBorder,
                                                        padding: 5,
                                                        overflow: 'hidden'
                                                    }}>
                                                        <Text style={{
                                                            color: hasExamToday ? C.danger : C.classText,
                                                            fontSize: 8,
                                                            fontWeight: '900'
                                                        }} numberOfLines={1}>
                                                            {cls.courseCode}
                                                        </Text>
                                                        {clsH > 32 && (
                                                            <Text style={{
                                                                color: hasExamToday ? C.danger : '#6366F1',
                                                                fontSize: 6.5,
                                                                fontWeight: '600',
                                                                marginTop: 2,
                                                                opacity: 0.8
                                                            }}>
                                                                {cTime(cls.startTime)}–{cTime(cls.endTime)}
                                                            </Text>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                            {colShifts.map((slot) => {
                                                const gIdx = schedule.indexOf(slot), isShift = mode === 'shifts', bH = Math.max((slot.end - slot.start) * PPM, 28);
                                                return (
                                                    <TouchableOpacity key={slot.start} activeOpacity={isPast ? 1 : 0.8} onPress={(e) => { e.stopPropagation(); if (isPast && isShift) return; setEditingIndex(gIdx); setEditDates([slot.shift_date]); setEditStart(slot.start); setEditEnd(slot.end); }} style={{ position: 'absolute', top: (slot.start - 5 * 60) * PPM, height: bH, left: 3, right: 3, borderRadius: 10, overflow: 'hidden', zIndex: 20, backgroundColor: isShift ? 'rgba(2, 132, 199, 0.9)' : 'rgba(5, 150, 105, 0.15)', borderWidth: isShift ? 0 : 1, borderColor: isShift ? 'transparent' : `${C.avail}65`, borderStyle: isShift ? 'solid' : 'dashed', shadowColor: isShift ? 'rgba(2, 132, 199, 0.4)' : 'transparent', shadowOffset: { width: 0, height: isShift ? 4 : 0 }, shadowOpacity: 1, shadowRadius: isShift ? 10 : 0, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                        <Text style={{ color: isShift ? '#fff' : C.avail, fontSize: 8, fontWeight: '800' }}>{isShift ? '⚡' : '✦'}</Text>
                                                        {bH > 34 && <Text style={{ color: isShift ? '#fff' : C.avail, fontSize: 7, fontWeight: '700', textAlign: 'center', lineHeight: 9, letterSpacing: 0.2 }}>{`${cTime(slot.start)}\n${cTime(slot.end)}`}</Text>}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </ScrollView>
                </View>
            </View>

            {/* ─── BOTTOM SAVE BAR ─── */}
            {!isSuccess && (
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 34, backgroundColor: 'rgba(244, 245, 242, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.88)', zIndex: 10 }}>
                    <TouchableOpacity onPress={mode === 'shifts' ? handleSaveShifts : handleExportAvailability} disabled={isSaving} style={{ width: '100%', height: 54, borderRadius: 27, overflow: 'hidden', shadowColor: accentGlow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: isSaving ? 0 : 1, shadowRadius: 24 }}>
                        <LinearGradient colors={isSaving ? [C.surfaceAlt, C.surfaceAlt] : accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: isSaving ? 'transparent' : 'rgba(255,255,255,0.6)', borderRadius: 27 }}>
                            {isSaving ? <Text style={{ letterSpacing: 2, fontSize: 12, textTransform: 'uppercase', color: C.muted }}>Saving…</Text> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.4 }}>{mode === 'shifts' ? '⚡ Lock In Schedule' : '✦ Save & Export PDF'}</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {isSuccess && (
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, backgroundColor: 'rgba(244, 245, 242, 0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.9)', alignItems: 'center', zIndex: 10 }}>
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>✅</Text>
                    <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{mode === 'shifts' ? 'Schedule locked in!' : 'Availability saved!'}</Text>
                </View>
            )}

            <ShiftEditor
                visible={editingIndex !== null}
                shiftIndex={editingIndex ?? -1}
                tempDates={editDates}
                tempStart={editStart}
                tempEnd={editEnd}
                weekStart={weekStart}
                mode={mode}
                onDayToggle={(day: string, date: string) => toggleEditDate(date)}
                onStartChange={setEditStart}
                onEndChange={setEditEnd}
                onSave={handleSaveEdit}
                onDelete={handleDelete}
                onClose={() => setEditingIndex(null)}
            />
        </View>
    );
}
