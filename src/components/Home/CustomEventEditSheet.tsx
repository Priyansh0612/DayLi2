import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Platform,
    TextInput,
    KeyboardAvoidingView,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trash2, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { C, formatTo12h } from './homeTokens';

// ─── Custom Event Edit Sheet ──────────────────────────────────
const CustomEventEditSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    event: any;
    title: string;
    setTitle: (t: string) => void;
    startTime: string;
    setStartTime: (t: string) => void;
    duration: string;
    setDuration: (t: string) => void;
    onUpdate: () => void;
    onDelete: () => void;
    isSaving: boolean;
    isNew?: boolean;
}> = ({ visible, onClose, event, title, setTitle, startTime, setStartTime, duration, setDuration, onUpdate, onDelete, isSaving, isNew }) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(600)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, bounciness: 6, speed: 14, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
            ]).start();
            setShowPicker(false);
        }
    }, [visible]);

    if (!event) return null;

    // Helper to parse the current startTime string into a Date object for the picker
    const getPickerDate = () => {
        const d = new Date(event.dateObj || Date.now());
        if (!startTime) return d;

        try {
            let hours = 0, minutes = 0;
            if (startTime.includes('AM') || startTime.includes('PM')) {
                const [time, modifier] = startTime.split(' ');
                let [h, m] = time.split(':').map(n => parseInt(n, 10));
                if (modifier === 'PM' && h < 12) h += 12;
                if (modifier === 'AM' && h === 12) h = 0;
                hours = h; minutes = m || 0;
            } else {
                const [h, m] = startTime.split(':').map(n => parseInt(n, 10));
                hours = h; minutes = m || 0;
            }
            d.setHours(hours, minutes, 0, 0);
        } catch (e) { console.error("Picker date parse err:", e); }
        return d;
    };

    const onPickerChange = (e: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowPicker(false);
        if (selectedDate) {
            const h = selectedDate.getHours();
            const m = selectedDate.getMinutes();
            // Format to HH:mm:ss for Supabase consistency
            const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
            setStartTime(formatted);
        }
    };

    return (
        <View pointerEvents={visible ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 300, justifyContent: 'flex-end' }}>
            <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(26,25,22,0.42)', opacity: fadeAnim }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
            </Animated.View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ width: '100%' }}
            >
                <Animated.View style={{ backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : Math.max(insets.bottom + 20, 28), shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.14, shadowRadius: 36, elevation: 20, transform: [{ translateY: slideAnim }] }}>
                    <View style={{ width: 34, height: 4, borderRadius: 4, backgroundColor: C.line, alignSelf: 'center', marginBottom: 18 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.primary }}>
                            {isNew ? "Quick Add" : "Edit Block"}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={22} color={C.muted} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }} className="font-body-bold">Event Title</Text>
                    <TextInput
                        style={{ height: 54, backgroundColor: C.tint, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: C.ink, marginBottom: 20 }}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Study Chemistry"
                    />

                    <View style={{ flexDirection: 'row', gap: 15, marginBottom: 25 }}>
                        <View style={{ flex: 1.2 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }} className="font-body-bold">Start Time</Text>
                            
                            {Platform.OS === 'ios' ? (
                                <View style={{ height: 54, backgroundColor: C.tint, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Clock size={16} color={C.muted} strokeWidth={2.2} />
                                        <DateTimePicker
                                            value={getPickerDate()}
                                            mode="time"
                                            display="compact"
                                            onChange={onPickerChange}
                                            accentColor={event?.category === 'academic' ? C.academic : (event?.category === 'meal' ? C.meal : C.work)}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    onPress={() => setShowPicker(true)}
                                    activeOpacity={0.7}
                                    style={{ height: 54, backgroundColor: C.tint, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Clock size={18} color={C.muted} strokeWidth={2.2} />
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: C.ink }} className="font-body-bold">
                                            {formatTo12h(startTime)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {Platform.OS === 'android' && showPicker && (
                                <DateTimePicker
                                    value={getPickerDate()}
                                    mode="time"
                                    display="default"
                                    onChange={onPickerChange}
                                />
                            )}
                        </View>

                        <View style={{ flex: 0.8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }} className="font-body-bold">Duration</Text>
                            <View style={{ height: 54, backgroundColor: C.tint, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <TextInput
                                    style={{ flex: 1, height: '100%', fontSize: 16, fontWeight: '600', color: C.ink }}
                                    value={duration}
                                    onChangeText={setDuration}
                                    keyboardType="decimal-pad"
                                    placeholder="1.5"
                                    className="font-body-bold"
                                />
                                <Text style={{ fontSize: 13, color: C.muted, fontWeight: '600' }} className="font-body">hrs</Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {!isNew && (
                            <TouchableOpacity
                                onPress={onDelete}
                                style={{ flex: 0.4, height: 56, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' }}
                            >
                                <Trash2 size={22} color={C.red} strokeWidth={2.5} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={onUpdate}
                            disabled={isSaving}
                            style={{
                                flex: 1,
                                height: 56,
                                borderRadius: 18,
                                backgroundColor: event?.category === 'academic' ? C.academic : (event?.category === 'meal' ? C.meal : C.work),
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: event?.category === 'academic' ? C.academic : (event?.category === 'meal' ? C.meal : C.work),
                                shadowOpacity: 0.18,
                                shadowRadius: 10,
                                shadowOffset: { width: 0, height: 4 },
                                elevation: 3
                            }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }} className="font-body-bold">
                                {isSaving ? "Saving..." : (isNew ? "Schedule Block" : "Save Changes")}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default CustomEventEditSheet;
