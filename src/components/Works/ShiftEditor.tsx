import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { C, DAYS_ORDER, cTime, formatDateSafely } from '../../utils/worksDashboardUtils';

export const ShiftEditor = (p: any) => {
    const slideAnim = useRef(new Animated.Value(600)).current;
    const bgAnim = useRef(new Animated.Value(0)).current;
    const [showStart, setShowStart] = useState(false);
    const [showEnd, setShowEnd] = useState(false);

    useEffect(() => {
        if (p.visible) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, tension: 220, friction: 24, useNativeDriver: true }),
                Animated.timing(bgAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
                Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [p.visible]);

    if (!p.visible && slideAnim === new Animated.Value(600)) return null;

    const accent = p.mode === 'shifts' ? C.shift : C.avail;
    const accentGrad = p.mode === 'shifts' ? C.shiftGrad : C.availGrad;
    const duration = (((p.tempEnd <= p.tempStart ? p.tempEnd + 1440 : p.tempEnd) - p.tempStart) / 60).toFixed(1);
    const todayStr = formatDateSafely(new Date());

    return (
        <View style={{ position: 'absolute', inset: 0, zIndex: 100 }} pointerEvents={p.visible ? "auto" : "none"}>
            <Animated.View style={{ position: 'absolute', inset: 0, opacity: bgAnim }}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(11, 17, 32, 0.4)' }} onPress={p.onClose} activeOpacity={1} />
            </Animated.View>

            <Animated.View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, transform: [{ translateY: slideAnim }], backgroundColor: '#FDFCF9', borderTopLeftRadius: 32, borderTopRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 30, paddingBottom: 44 }}>

                {/* Drag Handle */}
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
                    <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.borderMid }} />
                </View>

                <View style={{ paddingHorizontal: 24 }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <View>
                            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 24 }}>
                                {p.shiftIndex === -1 ? 'Add Shift' : 'Edit Shift'}
                            </Text>
                            <Text style={{ color: C.muted, fontSize: 13, marginTop: 4, fontWeight: '500' }}>
                                {duration}h · {p.mode === 'shifts' ? 'Official shift' : 'Available window'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={p.onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: C.inkMid, fontSize: 14, fontWeight: '800' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 14-Day Selection Grid (2 Rows of 7) */}
                    <Text style={{ color: C.ghost, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>SELECT DAYS</Text>

                    <View style={{ gap: 10, marginBottom: 24 }}>
                        {[0, 7].map(weekOffset => (
                            <View key={weekOffset} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                {Array.from({ length: 7 }).map((_, i) => {
                                    const dateObj = new Date(p.weekStart.getFullYear(), p.weekStart.getMonth(), p.weekStart.getDate() + i + weekOffset);
                                    const exactDate = formatDateSafely(dateObj);
                                    const dayName = DAYS_ORDER[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
                                    const isPast = p.mode === 'shifts' && exactDate < todayStr;
                                    const sel = p.tempDates?.includes(exactDate);

                                    return (
                                        <TouchableOpacity
                                            key={exactDate}
                                            disabled={isPast}
                                            onPress={() => p.onDayToggle(dayName, exactDate)}
                                            style={{ width: 42, height: 48, borderRadius: 12, backgroundColor: sel ? accent : C.surfaceAlt, opacity: isPast ? 0.3 : 1, alignItems: 'center', justifyContent: 'center', shadowColor: sel ? accent : 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}
                                        >
                                            <Text style={{ color: sel ? '#fff' : C.inkMid, fontWeight: '800', fontSize: 11 }}>
                                                {dayName.charAt(0)}
                                            </Text>
                                            <Text style={{ color: sel ? 'rgba(255,255,255,0.8)' : C.muted, fontSize: 10, marginTop: 2, fontWeight: '600' }}>
                                                {exactDate.split('-')[2]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    {/* Compact Time Pickers */}
                    <Text style={{ color: C.ghost, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 10 }}>TIME WINDOW</Text>
                    <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24 }}>

                        {/* Start Time */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
                            <Text style={{ color: C.ink, fontSize: 16, fontWeight: '600' }}>Starts</Text>
                            {Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={new Date(new Date().setHours(Math.floor(p.tempStart / 60), p.tempStart % 60))}
                                    mode="time"
                                    display="compact"
                                    minuteInterval={15}
                                    onChange={(e, d) => d && p.onStartChange(d.getHours() * 60 + d.getMinutes())}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity onPress={() => setShowStart(true)} style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                                        <Text style={{ fontWeight: '600', color: C.ink }}>{cTime(p.tempStart)}</Text>
                                    </TouchableOpacity>
                                    {showStart && (
                                        <DateTimePicker
                                            value={new Date(new Date().setHours(Math.floor(p.tempStart / 60), p.tempStart % 60))}
                                            mode="time"
                                            display="default"
                                            minuteInterval={15}
                                            onChange={(e, d) => {
                                                setShowStart(false);
                                                if (e.type === 'set' && d) p.onStartChange(d.getHours() * 60 + d.getMinutes());
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>

                        {/* End Time */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
                            <Text style={{ color: C.ink, fontSize: 16, fontWeight: '600' }}>Ends</Text>
                            {Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={new Date(new Date().setHours(Math.floor(p.tempEnd / 60), p.tempEnd % 60))}
                                    mode="time"
                                    display="compact"
                                    minuteInterval={15}
                                    onChange={(e, d) => d && p.onEndChange(d.getHours() * 60 + d.getMinutes())}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity onPress={() => setShowEnd(true)} style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                                        <Text style={{ fontWeight: '600', color: C.ink }}>{cTime(p.tempEnd)}</Text>
                                    </TouchableOpacity>
                                    {showEnd && (
                                        <DateTimePicker
                                            value={new Date(new Date().setHours(Math.floor(p.tempEnd / 60), p.tempEnd % 60))}
                                            mode="time"
                                            display="default"
                                            minuteInterval={15}
                                            onChange={(e, d) => {
                                                setShowEnd(false);
                                                if (e.type === 'set' && d) p.onEndChange(d.getHours() * 60 + d.getMinutes());
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {p.shiftIndex !== -1 && (
                            <TouchableOpacity onPress={p.onDelete} style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: `${C.danger}12`, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 22 }}>🗑</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={p.onSave} activeOpacity={0.8} style={{ flex: 1, height: 56, borderRadius: 16, overflow: 'hidden', shadowColor: accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 20 }}>
                            <LinearGradient colors={accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }}>
                                    {p.shiftIndex === -1 ? `Add ${p.tempDates?.length || 1} Shift${p.tempDates?.length > 1 ? 's' : ''}` : 'Save Changes'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};
