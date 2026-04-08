import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    Animated, Dimensions, TextInput, Modal, KeyboardAvoidingView,
    Platform, Keyboard, InputAccessoryView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FileText, CalendarDays } from 'lucide-react-native';
import { Transaction } from '../../services/expenseService';
import { C, DEFAULT_CATEGORIES, getLocalYYYYMMDD, CategoryIcon } from '../../utils/expenseDashboardUtils';

const { height: SH } = Dimensions.get('window');

export const QuickAddModal = ({
    visible, initialData, onClose, onSave, categories,
}: {
    visible: boolean;
    initialData?: Transaction | null;
    onClose: () => void;
    onSave: (amount: number, title: string, category: string, dateStr: string, id?: string) => Promise<void>;
    categories: any[];
}) => {
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].id);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const slideAnim = useRef(new Animated.Value(SH)).current;

    useEffect(() => {
        if (visible) {
            setSaving(false);
            if (initialData) {
                setAmount(Math.abs(Number(initialData.amount)).toFixed(2));
                setTitle(initialData.title);
                setCategory(initialData.category);
                const parsedDate = new Date(initialData.date);
                setDate(isNaN(parsedDate.getTime()) ? new Date() : parsedDate);
            } else {
                setAmount(''); setTitle('');
                setCategory(categories[0]?.id || DEFAULT_CATEGORIES[0].id);
                setDate(new Date());
            }

            Animated.spring(slideAnim, {
                toValue: 0,
                bounciness: 4,
                useNativeDriver: true,
            }).start();
        } else {
            slideAnim.setValue(SH);
            Keyboard.dismiss();
            setShowDatePicker(false);
        }
    }, [visible, initialData]);

    const handleClose = () => {
        Keyboard.dismiss();
        setTimeout(() => {
            Animated.timing(slideAnim, {
                toValue: SH,
                duration: 250,
                useNativeDriver: true,
            }).start(() => onClose());
        }, 100);
    };

    const handleSave = async () => {
        if (!amount || isNaN(Number(amount))) return;
        setSaving(true);
        const yyyymmdd = getLocalYYYYMMDD(date);
        const safeDateString = `${yyyymmdd}T12:00:00`;
        const finalAmount = Math.abs(Number(amount));
        await onSave(finalAmount, title || 'Quick expense', category, safeDateString, initialData?.id);
        setSaving(false);
        handleClose();
    };

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,25,22,0.6)' }}>
                <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Animated.View style={{
                        backgroundColor: C.surface,
                        borderTopLeftRadius: 36, borderTopRightRadius: 36,
                        padding: 24, paddingBottom: Platform.OS === 'ios' ? 48 : 24,
                        transform: [{ translateY: slideAnim }],
                        shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
                        shadowOpacity: 0.1, shadowRadius: 20,
                        maxHeight: SH * 0.85, // Ensures it doesn't push off-screen
                    }}>
                        {/* Drag Handle */}
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: C.lineMid }} />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 10 }}>
                            {/* Title */}
                            <Text style={{ fontSize: 18, fontWeight: '800', fontFamily: 'Outfit_700Bold', color: C.ink, textAlign: 'center', marginBottom: 20, letterSpacing: -0.3 }}>
                                {initialData ? 'Edit Expense' : 'Log Expense'}
                            </Text>

                            {/* Amount - Huge & Centered */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                <Text style={{ fontSize: 32, color: C.ghost, fontFamily: 'Outfit_700Bold', marginRight: 4 }}>$</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                    inputAccessoryViewID="doneAmount"
                                    placeholder="0.00"
                                    placeholderTextColor={C.lineMid}
                                    selectionColor={C.emerald}
                                    cursorColor={C.emerald}
                                    style={{
                                        fontSize: 54, fontFamily: 'Outfit_700Bold',
                                        color: C.ink, letterSpacing: -2, padding: 0,
                                        height: 70, minWidth: 100, textAlign: 'center'
                                    }}
                                />
                            </View>

                            {/* Middle Action Bar - Note & Date */}
                            <View style={{ backgroundColor: C.canvas, borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.line }}>
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 14, marginBottom: 14 }}>
                                    <View style={{ marginRight: 14 }}><FileText size={20} color={C.muted} /></View>
                                    <TextInput
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="What was this for?"
                                        placeholderTextColor={C.ghost}
                                        selectionColor={C.emerald}
                                        cursorColor={C.emerald}
                                        style={{ flex: 1, fontSize: 16, color: C.ink, fontWeight: '500', padding: 0 }}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setShowDatePicker(true);
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                    activeOpacity={0.6}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ marginRight: 14 }}><CalendarDays size={20} color={C.muted} /></View>
                                        <Text style={{ fontSize: 16, color: C.ink, fontWeight: '500' }}>
                                            {getLocalYYYYMMDD(date) === getLocalYYYYMMDD(new Date()) ? 'Today' : date.toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text style={{ color: C.ghost, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Edit</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Categories Box */}
                            <Text style={{ fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginLeft: 6 }}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginHorizontal: -24 }}>
                                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 24 }}>
                                    {categories.map((cat, idx) => {
                                        const sel = category === cat.id;
                                        return (
                                            <TouchableOpacity
                                                key={cat.id || idx}
                                                onPress={() => setCategory(cat.id)}
                                                activeOpacity={0.7}
                                                style={{
                                                    paddingHorizontal: 16, paddingVertical: 12,
                                                    borderRadius: 18,
                                                    backgroundColor: sel ? C.emerald : C.canvas,
                                                    borderWidth: 1,
                                                    borderColor: sel ? C.emerald : C.line,
                                                    flexDirection: 'row', alignItems: 'center', gap: 8,
                                                    shadowColor: sel ? C.emerald : '#000',
                                                    shadowOffset: { width: 0, height: sel ? 4 : 0 },
                                                    shadowOpacity: sel ? 0.25 : 0,
                                                    shadowRadius: sel ? 8 : 0,
                                                }}
                                            >
                                                <CategoryIcon name={cat.icon} size={20} color={sel ? '#ffffff' : C.inkMid} />
                                                <Text style={{
                                                    color: sel ? '#ffffff' : C.inkMid,
                                                    fontWeight: sel ? '700' : '600', fontSize: 14,
                                                }}>
                                                    {cat.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            {/* Interactive Save Button */}
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                activeOpacity={0.8}
                                style={{
                                    height: 56, borderRadius: 20,
                                    backgroundColor: saving ? C.tint : C.ink,
                                    alignItems: 'center', justifyContent: 'center',
                                    shadowColor: C.ink,
                                    shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: saving ? 0 : 0.2,
                                    shadowRadius: 16,
                                }}
                            >
                                <Text style={{ color: saving ? C.muted : '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }}>
                                    {saving ? 'Saving…' : initialData ? 'Update Expense' : 'Log Expense'}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>

                {Platform.OS === 'ios' && (
                    <InputAccessoryView nativeID="doneAmount">
                        <View style={{ backgroundColor: '#F8F9FA', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                            <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                                <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </InputAccessoryView>
                )}

                {/* Inline Calendar Modal for iOS & Android Handle */}
                {Platform.OS === 'ios' && showDatePicker ? (
                    <View style={{ position: "absolute", inset: 0, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDatePicker(false)} />
                        <Animated.View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, alignItems: "center" }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#F1F5F9", width: "100%" }}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ padding: 8 }}>
                                    <Text style={{ color: "#EF4444", fontWeight: "800" }}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 16, fontWeight: "800", color: C.ink }}>Select Date</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ padding: 8, backgroundColor: C.tint, borderRadius: 12 }}>
                                    <Text style={{ color: C.ink, fontWeight: "800" }}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ width: "100%", alignItems: "center", paddingHorizontal: 10, paddingTop: 10 }}>
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="inline"
                                    style={{ alignSelf: 'center', width: '100%' }}
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) setDate(selectedDate);
                                    }}
                                />
                            </View>
                        </Animated.View>
                    </View>
                ) : Platform.OS !== 'ios' && showDatePicker ? (
                    <DateTimePicker
                        value={date} mode="date" display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) setDate(selectedDate);
                        }}
                    />
                ) : null}
            </View>
        </Modal>
    );
};
