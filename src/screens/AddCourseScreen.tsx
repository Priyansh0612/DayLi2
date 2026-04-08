import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Switch, Platform, Keyboard, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { X, Plus, Clock, Trash2 } from 'lucide-react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = [
    "#C27780", // Dusty Rose
    "#65967B", // Soft Sage
    "#CF8F5A", // Warm Sand
    "#7D739C", // Lavender Gray
    "#639CBE", // Powder Blue
    "#5C7C8A", // Steel Slate
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TYPES = ['Lecture', 'Lab', 'Tutorial'];

// Helper to format 'HH:mm' string to 'h:mm AM/PM'
const formatTimeForDisplay = (timeStr: string) => {
    if (!timeStr) return "Select";
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr);
    const m = parseInt(mStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const AddCourseScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute<any>();
    const [loading, setLoading] = useState(false);

    // Refs for input navigation
    const nameRef = useRef<TextInput>(null);
    const profNameRef = useRef<TextInput>(null);
    const profEmailRef = useRef<TextInput>(null);

    // Course Details
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [professorName, setProfessorName] = useState('');
    const [professorEmail, setProfessorEmail] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);

    // Dynamic Class Slots
    const [classSlots, setClassSlots] = useState([
        { day: 'Monday', start: '10:00', end: '11:30', type: 'Lecture', location: '' }
    ]);

    // Picker states
    const [showPicker, setShowPicker] = useState(false);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setShowPicker(false);
            }
        );
        return () => {
            keyboardDidShowListener.remove();
        };
    }, []);

    // Helper to get a Date object from 'HH:mm' for the picker
    const getDateFromTimeStr = (timeStr: string) => {
        const d = new Date();
        const [h, m] = timeStr.split(':').map(Number);
        d.setHours(h, m, 0, 0);
        return d;
    };

    const onPickerChange = (event: any, selectedDate?: Date) => {
        // On Android, the picker closes immediately. On iOS, we keep it till they are done.
        if (Platform.OS === 'android') setShowPicker(false);

        if (selectedDate && activeIdx !== null && activeField !== null) {
            const h = selectedDate.getHours().toString().padStart(2, '0');
            const m = selectedDate.getMinutes().toString().padStart(2, '0');
            updateSlot(activeIdx, activeField, `${h}:${m}`);
        }
    };

    // ... exists ...
    const updateSlot = (index: number, field: string, value: string) => {
        const newSlots = [...classSlots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setClassSlots(newSlots);
    };

    const addSlot = () => {
        setClassSlots([...classSlots, { day: 'Monday', start: '12:00', end: '13:00', type: 'Lecture', location: '' }]);
    };
    const removeSlot = (index: number) => {
        const newSlots = classSlots.filter((_, i) => i !== index);
        setClassSlots(newSlots);
    };

    // ... exists ...
    const handleSave = async () => {
        // (no changes needed here)
        if (!code || !name) {
            Alert.alert("Missing Info", "Please enter a Course Code and Name.");
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user logged in");

            let semesterId;
            const { data: semesters } = await supabase.from('semesters').select('id').limit(1);

            if (semesters && semesters.length > 0) {
                semesterId = semesters[0].id;
            } else {
                const { data: newSem, error: semError } = await supabase
                    .from('semesters')
                    .insert({ user_id: user.id, name: 'Winter 2026', is_current: true })
                    .select()
                    .single();
                if (semError) throw semError;
                semesterId = newSem.id;
            }

            const { data: newCourse, error: courseError } = await supabase
                .from('courses')
                .insert({
                    user_id: user.id,
                    semester_id: semesterId,
                    code,
                    name,
                    professor_name: professorName,
                    professor_email: professorEmail,
                    color: selectedColor
                })
                .select()
                .single();

            if (courseError) throw courseError;

            const classesToInsert = classSlots.map(slot => ({
                course_id: newCourse.id,
                day_of_week: slot.day,
                start_time: slot.start,
                end_time: slot.end,
                location: slot.location,
                type: slot.type
            }));

            const { error: classError } = await supabase.from('classes').insert(classesToInsert);
            if (classError) throw classError;

            Alert.alert("Success", "Course added!", [{ text: "OK", onPress: () => navigation.goBack() }]);

        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Picker Render ──
    const renderTimePicker = () => {
        if (!showPicker || activeIdx === null || activeField === null) return null;
        const currentTimeStr = classSlots[activeIdx][activeField];

        return (
            <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPicker(false)} />
                <View style={{ backgroundColor: '#fff', paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                        <TouchableOpacity onPress={() => setShowPicker(false)}>
                            <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={{ fontWeight: '700' }}>Select {activeField === 'start' ? 'Start' : 'End'} Time</Text>
                        <TouchableOpacity onPress={() => setShowPicker(false)}>
                            <Text style={{ color: '#6366f1', fontWeight: '700' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <DateTimePicker
                        value={getDateFromTimeStr(currentTimeStr)}
                        mode="time"
                        display="spinner"
                        onChange={onPickerChange}
                    />
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            {renderTimePicker()}
            <View className="px-6 py-4 border-b border-gray-100 flex-row justify-between items-center">
                <Text className="text-xl font-heading text-gray-900">Add New Course</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <X color="#6B7280" size={24} />
                </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
                className="flex-1 px-6 pt-6"
                extraScrollHeight={100}
                enableOnAndroid={true}
                keyboardShouldPersistTaps="handled"
            >

                {/* Course Info */}
                <Text className="text-gray-400 font-body-bold text-[10px] uppercase tracking-widest mb-2">Course Details</Text>
                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 font-body text-base"
                    placeholder="Course Code (e.g. COMP 3000)"
                    value={code}
                    onChangeText={setCode}
                    autoFocus={true}
                    returnKeyType="next"
                    onSubmitEditing={() => nameRef.current?.focus()}
                />
                <TextInput
                    ref={nameRef}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 font-body text-base"
                    placeholder="Course Name (e.g. Operating Systems)"
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    onSubmitEditing={() => profNameRef.current?.focus()}
                />

                {/* Professor Info */}
                <Text className="text-gray-400 font-body-bold text-[10px] uppercase tracking-widest mb-2">Professor Details</Text>
                <TextInput
                    ref={profNameRef}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 font-body text-base"
                    placeholder="Professor Name"
                    value={professorName}
                    onChangeText={setProfessorName}
                    returnKeyType="next"
                    onSubmitEditing={() => profEmailRef.current?.focus()}
                />
                <TextInput
                    ref={profEmailRef}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 font-body text-base"
                    placeholder="Email (e.g. prof@uni.edu)"
                    value={professorEmail}
                    onChangeText={setProfessorEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                />

                {/* Color Picker */}
                <Text className="text-gray-400 font-body-bold text-[10px] uppercase tracking-widest mb-2">Color Tag</Text>
                <View className="flex-row gap-3 mb-8">
                    {COLORS.map(c => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => setSelectedColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-10 h-10 rounded-full ${selectedColor === c ? 'border-4 border-gray-300' : ''}`}
                        />
                    ))}
                </View>

                {/* Class Times */}
                <Text className="text-gray-400 font-body-bold text-[10px] uppercase tracking-widest mb-2">Class Schedule</Text>

                {classSlots.map((slot, index) => (
                    <View key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-3">
                        <View className="flex-row justify-between mb-3">
                            <View className="flex-row flex-1 gap-2 mr-4">
                                {DAYS.map(d => (
                                    <TouchableOpacity
                                        key={d}
                                        onPress={() => updateSlot(index, 'day', d)}
                                        className={`flex-1 py-1.5 rounded-full items-center justify-center ${slot.day === d ? 'bg-primary' : 'bg-gray-200'}`}
                                    >
                                        <Text className={`${slot.day === d ? 'text-white' : 'text-gray-500'} text-[11px] font-body-bold`}>{d.substring(0, 3)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {classSlots.length > 1 && (
                                <TouchableOpacity onPress={() => removeSlot(index)}>
                                    <Trash2 color="#EF4444" size={20} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View className="flex-row gap-3 mb-3">
                            {/* Native Time Picker Buttons */}
                            <TouchableOpacity
                                onPress={() => { Keyboard.dismiss(); setActiveIdx(index); setActiveField('start'); setShowPicker(true); }}
                                className="flex-1 bg-white border border-gray-200 rounded-lg p-3 items-center justify-center"
                            >
                                <Text className="text-gray-400 text-[10px] uppercase font-body-bold mb-0.5">Start Time</Text>
                                <Text className="font-heading text-sm text-gray-900">{formatTimeForDisplay(slot.start)}</Text>
                            </TouchableOpacity>

                            <View className="justify-center"><Clock color="#CBD5E1" size={16} /></View>

                            <TouchableOpacity
                                onPress={() => { Keyboard.dismiss(); setActiveIdx(index); setActiveField('end'); setShowPicker(true); }}
                                className="flex-1 bg-white border border-gray-200 rounded-lg p-3 items-center justify-center"
                            >
                                <Text className="text-gray-400 text-[10px] uppercase font-body-bold mb-0.5">End Time</Text>
                                <Text className="font-heading text-sm text-gray-900">{formatTimeForDisplay(slot.end)}</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-3">
                            <TextInput
                                className="flex-1 bg-white border border-gray-200 rounded-lg p-2.5 font-body text-sm"
                                placeholder="Location (AT 1020)"
                                value={slot.location}
                                onChangeText={(t) => updateSlot(index, 'location', t)}
                            />
                            {/* Type Toggle (Lecture/Lab) */}
                            <TouchableOpacity
                                onPress={() => updateSlot(index, 'type', slot.type === 'Lecture' ? 'Lab' : 'Lecture')}
                                className="bg-white border border-gray-200 rounded-lg px-4 justify-center"
                            >
                                <Text className="text-primary font-body-bold text-sm">{slot.type}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <TouchableOpacity onPress={addSlot} className="flex-row items-center justify-center py-3 mb-10 border border-dashed border-gray-300 rounded-xl">
                    <Plus color="#94A3B8" size={18} />
                    <Text className="text-gray-400 font-body-bold text-sm ml-2">Add Another Session</Text>
                </TouchableOpacity>

            </KeyboardAwareScrollView>

            {/* Bottom Save Button */}
            <View className="p-4 border-t border-gray-100">
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading}
                    style={{ elevation: 5 }}
                    className="bg-primary w-full py-4 rounded-xl items-center shadow-lg shadow-indigo-200"
                >
                    <Text className="text-white font-heading text-lg">
                        {loading ? "Saving..." : "Save Course"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default AddCourseScreen;
