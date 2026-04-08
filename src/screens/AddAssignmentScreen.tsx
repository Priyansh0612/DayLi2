import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform, StatusBar, Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
// import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Calendar as CalendarIcon, Save } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../config/supabase';
import { getTheme } from '../utils/courseDetailsUtils';

const ASSESSMENT_TYPES = [
    { id: 'assignment', label: 'Assignment' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'midterm', label: 'Midterm' },
    { id: 'final', label: 'Final Exam' },
    { id: 'project', label: 'Project' },
    { id: 'lab', label: 'Lab' },
    { id: 'discussion', label: 'Discussion' },
];

export default function AddAssignmentScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { courseId, courseColor, courseCode } = route.params || {};

    const theme = getTheme(courseCode, courseColor);

    const [title, setTitle] = useState('');
    const [weight, setWeight] = useState('');
    const [selectedType, setSelectedType] = useState('assignment');
    const [date, setDate] = useState(new Date());

    // Controls showing the calendar
    const [showCalendar, setShowCalendar] = useState(false);
    const [loading, setLoading] = useState(false);

    // Handle Date Change from Calendar
    const onDayPress = (day: any) => {
        // day.dateString is YYYY-MM-DD
        // Create a date object in local time (or preserve current time if needed)
        // For simplicity, we create a date at 12:00 PM local time on that day to avoid timezone shifts
        // But since we just need the date for the DB, YYYY-MM-DD is key.
        // However, the state uses Date object.

        // Construct date: UTC midnight for that day, or local?
        // Let's stick to noon local to be safe.
        // Or parse the string manually.
        const parts = day.dateString.split('-');
        const newDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);

        setDate(newDate);
        setShowCalendar(false);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Missing Info', 'Please enter a title');
            return;
        }

        setLoading(true);
        try {
            // 🟢 FIX: Force Time to Noon (12:00:00)
            const dateToSave = new Date(date);
            dateToSave.setUTCHours(12, 0, 0, 0);

            const { error } = await supabase.from('assessments').insert({
                course_id: courseId,
                title,
                type: selectedType,
                weight: weight ? parseFloat(weight) : 0,
                due_date: dateToSave.toISOString(), // Saves the selected date
                is_completed: false
            });

            if (error) throw error;
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    // Get current date string for marking the calendar
    const currentDateString = date.toISOString().split('T')[0];

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={{ paddingTop: insets.top + 10 }} className="pb-4 px-6 border-b border-gray-100 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xl font-heading text-gray-800">Add Assessment</Text>
                <View className="w-8" />
            </View>

            <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Title */}
                <Text className="text-gray-400 font-body-bold text-[10px] uppercase tracking-widest mb-2">Title</Text>
                <TextInput
                    className="bg-gray-50 p-4 rounded-xl text-base font-body text-gray-800 border border-gray-100 mb-6"
                    placeholder="e.g. Midterm 1"
                    value={title}
                    onChangeText={setTitle}
                />

                {/* Type Selector */}
                <Text className="text-gray-400 font-body-bold text-[10px] uppercase tracking-widest mb-2">Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row">
                    {ASSESSMENT_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.id}
                            onPress={() => setSelectedType(type.id)}
                            className={`mr-3 px-5 py-3 rounded-full border ${selectedType === type.id ? '' : 'bg-white border-gray-200'
                                }`}
                            style={selectedType === type.id ? { backgroundColor: theme.primary, borderColor: theme.primary } : undefined}
                        >
                            <Text className={`font-body-bold ${selectedType === type.id ? 'text-white' : 'text-gray-600'}`}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Weight */}
                <Text className="text-gray-400 font-body-bold text-[10px] uppercase tracking-widest mb-2">Weight (%)</Text>
                <View className="flex-row items-center mb-6">
                    <TextInput
                        className="flex-1 bg-gray-50 p-4 rounded-xl text-base font-body text-gray-800 border border-gray-100"
                        placeholder="0"
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={setWeight}
                    />
                    <Text className="ml-3 text-gray-400 font-heading text-xl">%</Text>
                </View>

                {/* Date Picker Trigger */}
                <Text className="text-gray-400 font-body-bold text-[10px] uppercase tracking-widest mb-2">Due Date</Text>
                <TouchableOpacity
                    onPress={() => { Keyboard.dismiss(); setShowCalendar(!showCalendar); }}
                    className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-row items-center mb-8"
                >
                    <CalendarIcon color="#6b7280" size={20} className="mr-3" />
                    <Text className="text-gray-800 font-body text-base">
                        {date.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                    </Text>
                </TouchableOpacity>

                {/* --- INLINE CALENDAR --- */}
                {showCalendar && (
                    <View className="mb-8 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <Calendar
                            current={currentDateString}
                            minDate={currentDateString}
                            onDayPress={onDayPress}
                            markedDates={{
                                [currentDateString]: { selected: true, selectedColor: theme.primary }
                            }}
                            theme={{
                                selectedDayBackgroundColor: theme.primary,
                                todayTextColor: theme.primary,
                                arrowColor: theme.primary,
                                dotColor: theme.primary,
                                textDayFontFamily: 'PlusJakartaSans_500Medium',
                                textMonthFontFamily: 'Outfit_700Bold',
                                textDayHeaderFontFamily: 'PlusJakartaSans_600SemiBold',
                            }}
                        />
                    </View>
                )}

            </ScrollView>

            {/* Save Button */}
            <View className="p-6 border-t border-gray-100">
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading}
                    style={{ elevation: 5, backgroundColor: theme.primary, shadowColor: theme.primary }}
                    className={`p-4 rounded-2xl flex-row items-center justify-center shadow-lg ${loading ? 'opacity-70' : ''}`}
                >
                    <Save color="white" size={20} className="mr-2" />
                    <Text className="text-white font-heading text-lg">Save Assessment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
