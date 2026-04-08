import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ChevronRight, FileText, User, Clock, BookOpen } from 'lucide-react-native';
import { C } from './homeTokens';

// ─── Gap Action Sheet ─────────────────────────────────────────
const GapActionSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    gapItem: any;
    urgentAssessment: any;
    onSelectAction: (type: 'smart' | 'study' | 'personal', customTitle?: string) => void;
    onMarkDone: (id: string) => void;
}> = ({ visible, onClose, gapItem, urgentAssessment, onSelectAction, onMarkDone }) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // ── 1. Context-Aware Mode Switch ──
    const nowLocal = new Date();
    const currentHour = nowLocal.getHours();

    // Physical check: Is it 12 AM - 5 AM?
    const isLateNightRightNow = currentHour >= 0 && currentHour < 5;

    // Item check: Is the gap happening right now (within 30 mins)?
    const isGapHappeningNow = gapItem ? Math.abs(new Date(gapItem.dateObj).getTime() - nowLocal.getTime()) < (30 * 60 * 1000) : false;

    // Result: Only nudge if both are true
    const showLateNightNudge = isLateNightRightNow && isGapHappeningNow;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, bounciness: 6, speed: 14, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    return (
        <View pointerEvents={visible ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 200, justifyContent: 'flex-end' }}>
            <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(26,25,22,0.42)', opacity: fadeAnim }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
            </Animated.View>
            <Animated.View style={{ backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : Math.max(insets.bottom + 20, 28), shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.14, shadowRadius: 36, elevation: 20, transform: [{ translateY: slideAnim }] }}>

                <View style={{ width: 34, height: 4, borderRadius: 4, backgroundColor: C.line, alignSelf: 'center', marginBottom: 18 }} />

                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.primary, marginBottom: 4 }}>Fill this time</Text>

                {/* 🔴 2. Dynamic Warning Text (Only shows at late night) */}
                {showLateNightNudge ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, backgroundColor: 'rgba(217,119,6,0.08)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(217,119,6,0.15)' }}>
                        <AlertCircle size={14} color={C.amber} />
                        <Text style={{ fontSize: 13, color: C.amber, fontWeight: '600' }} className="font-body">
                            Late night grind? Don't forget to recharge.
                        </Text>
                    </View>
                ) : (
                    <Text style={{ fontSize: 13, color: C.muted, fontWeight: '500', marginBottom: 20 }} className="font-body">
                        What would you like to schedule for {gapItem?.time}?
                    </Text>
                )}

                {/* Option 1: AI Smart Suggestion (Sleep vs Study) */}
                {gapItem?.smartData && (
                    <View style={{ marginBottom: 10 }}>
                        <TouchableOpacity
                            onPress={() => onSelectAction(gapItem.smartData.action, gapItem.smartData.taskTitle)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: gapItem.smartData.bg, borderWidth: 1, borderColor: gapItem.smartData.border }}
                            activeOpacity={0.7}
                        >
                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                                {gapItem.smartData.icon === 'moon' ? <Clock size={20} color={gapItem.smartData.color} /> : <BookOpen size={20} color={gapItem.smartData.color} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: gapItem.smartData.color, marginBottom: 2 }} className="font-body-bold">{gapItem.smartData.title}</Text>
                                <Text style={{ fontSize: 12, color: gapItem.smartData.color, opacity: 0.8, fontWeight: '500' }} className="font-body">{gapItem.smartData.subtitle}</Text>
                            </View>
                            <ChevronRight size={16} color={gapItem.smartData.color} opacity={0.5} />
                        </TouchableOpacity>

                        {/* 🔴 THE ALTERNATIVES SECTION 🔴 */}
                        {gapItem.smartData.alternatives && gapItem.smartData.alternatives.length > 0 && (
                            <View style={{ marginTop: 8, marginBottom: 4, paddingHorizontal: 4 }}>
                                <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 8 }}>Or swap with:</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {gapItem.smartData.alternatives.map((alt: any) => (
                                        <TouchableOpacity
                                            key={alt.id}
                                            onPress={() => onSelectAction('smart', alt.fullTitle)}
                                            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: C.ink }} className="font-body-bold">
                                                {alt.fullTitle}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* 🔴 THE MAGIC MARK AS DONE BUTTON 🔴 */}
                        {gapItem.smartData.action === 'smart' && gapItem.smartData.assessmentId && !gapItem.smartData.isExam && (
                            <TouchableOpacity
                                onPress={() => onMarkDone(gapItem.smartData.assessmentId)}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 }}
                            >
                                <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: C.green, alignItems: 'center', justifyContent: 'center' }} />
                                <Text style={{ fontSize: 11, fontWeight: '600', color: C.green }} className="font-body-bold">
                                    I already finished "{gapItem.smartData.taskTitle}"
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Option 2: Custom Study Block (Dimmed ONLY at night) */}
                <TouchableOpacity
                    onPress={() => onSelectAction('study')}
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18,
                        backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, marginBottom: 10,
                        opacity: showLateNightNudge ? 0.5 : 1 // 🔴 Dims the button
                    }}
                    activeOpacity={0.7}
                >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 2 }} className="font-body-bold">Custom Study Block</Text>
                        <Text style={{ fontSize: 12, color: C.muted, fontWeight: '500' }} className="font-body">Review notes, read, etc.</Text>
                    </View>
                    <ChevronRight size={16} color={C.ghost} />
                </TouchableOpacity>

                {/* Option 3: Personal Time */}
                <TouchableOpacity
                    onPress={() => onSelectAction('personal')}
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18,
                        backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, marginBottom: 10,
                        opacity: showLateNightNudge ? 0.7 : 1 // 🔴 Slightly less dimmed
                    }}
                    activeOpacity={0.7}
                >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}>
                        <User size={20} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 2 }} className="font-body-bold">Personal Time</Text>
                        <Text style={{ fontSize: 12, color: C.muted, fontWeight: '500' }} className="font-body">Gym, errands, or relaxation</Text>
                    </View>
                    <ChevronRight size={16} color={C.ghost} />
                </TouchableOpacity>

            </Animated.View>
        </View>
    );
};

export default GapActionSheet;
