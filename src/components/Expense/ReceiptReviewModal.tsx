import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { C, getLocalYYYYMMDD, Label, CUR_SYM } from '../../utils/expenseDashboardUtils';

export const ReceiptReviewModal = ({
    visible, data, onClose, onConfirm,
}: {
    visible: boolean; data: any; onClose: () => void;
    onConfirm: (updatedData: any) => Promise<void>;
}) => {
    const [total, setTotal] = useState('');
    const [storeName, setStoreName] = useState('');
    const [dateString, setDateString] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [taxAmount, setTaxAmount] = useState('');
    const [saving, setSaving] = useState(false);
    // FIX (Bug 12): Capture imageUrl at open time so it's never lost on state changes
    const capturedImageUrl = useRef<string | null>(null);

    useEffect(() => {
        if (visible && data) {
            const rawTotal = data.total_spent ?? data.total_amount ??
                data.items?.reduce((s: any, i: any) => s + (Number(i.price) || 0), 0) ?? 0;
            setTotal(Number(rawTotal).toFixed(2));
            setStoreName(data.store_name || '');
            setDateString(data.purchase_date || getLocalYYYYMMDD(new Date()));
            setItems((data.items || []).map((item: any) => ({ ...item, price: Number(item.price) || 0 })));
            setTaxAmount(Number(data.tax_amount || 0).toFixed(2));
            capturedImageUrl.current = data.imageUrl || null;
        }
    }, [visible, data]);

    if (!visible || !data) return null;

    const handleConfirm = async () => {
        setSaving(true);
        const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
        // FIX (Bug 12): Use captured imageUrl from ref, not from potentially-null state
        await onConfirm({
            ...data,
            items,
            store_name: storeName,
            purchase_date: dateString,
            total_spent: Number(total),
            tax_amount: Number(taxAmount),
            subtotal,
            imageUrl: capturedImageUrl.current,
        });
        setSaving(false);
    };

    const updateItem = (index: number, field: string, value: string) => {
        const newItems = [...items];
        if (field === 'price') {
            const num = value.replace(/[^0-9.]/g, '');
            newItems[index][field] = num === '' ? 0 : Number(num);
            const newSubtotal = newItems.reduce((s, i) => s + (Number(i.price) || 0), 0);
            setTotal((newSubtotal + Number(taxAmount)).toFixed(2));
        } else { newItems[index][field] = value; }
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        const newSubtotal = newItems.reduce((s, i) => s + (Number(i.price) || 0), 0);
        setTotal((newSubtotal + Number(taxAmount)).toFixed(2));
    };

    const addItem = () => {
        setItems([...items, { clean_name: 'New Item', original_text: 'New Item', price: 0, category: 'Other' }]);
    };

    const inputStyle = {
        backgroundColor: C.raised, borderRadius: 14, padding: 14,
        fontSize: 15, color: C.ink, fontWeight: '500' as const,
        borderWidth: 1, borderColor: C.line, marginBottom: 12,
    };

    return (
        <Modal transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,25,22,0.45)' }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: C.surface,
                        borderTopLeftRadius: 32, borderTopRightRadius: 32,
                        padding: 24, paddingBottom: 48, maxHeight: '90%',
                        shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
                        shadowOpacity: 0.08, shadowRadius: 20,
                    }}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.line }} />
                        </View>

                        <Text style={{
                            fontSize: 18, fontWeight: '700', color: C.ink,
                            marginBottom: 18, textAlign: 'center', letterSpacing: -0.3,
                        }}>
                            {data?.isEditingSavedReceipt ? 'Edit Receipt' : 'Review Receipt'}
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 14 }}>
                            {/* Total */}
                            <Label style={{ marginBottom: 6, marginLeft: 2 }}>Total Amount</Label>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 }}>
                                <Text style={{ fontSize: 22, color: C.ghost, fontWeight: '300', marginBottom: 6, marginRight: 3 }}>{CUR_SYM}</Text>
                                <Text style={{ fontSize: 40, fontWeight: '300', color: C.ink, letterSpacing: -1.5 }}>{total}</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: C.muted, fontWeight: '500', marginBottom: 18, marginLeft: 2 }}>
                                Auto-calculated from items + tax
                            </Text>

                            <Label style={{ marginBottom: 6, marginLeft: 2 }}>Store Name</Label>
                            <TextInput value={storeName} onChangeText={setStoreName} style={inputStyle} />

                            <Label style={{ marginBottom: 6, marginLeft: 2 }}>Date (YYYY-MM-DD)</Label>
                            <TextInput value={dateString} onChangeText={setDateString} style={inputStyle} />

                            {/* Items header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 }}>
                                <Label>{`Items (${items.length})`}</Label>
                                <TouchableOpacity
                                    onPress={addItem}
                                    style={{
                                        backgroundColor: C.tint, paddingHorizontal: 12,
                                        paddingVertical: 6, borderRadius: 20,
                                        borderWidth: 1, borderColor: C.line,
                                    }}
                                >
                                    <Text style={{ color: C.inkMid, fontWeight: '700', fontSize: 12 }}>+ Add Item</Text>
                                </TouchableOpacity>
                            </View>

                            {items.map((item, index) => (
                                <View key={index} style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    marginBottom: 8, padding: 12,
                                    backgroundColor: C.raised, borderRadius: 14,
                                    borderWidth: 1, borderColor: C.line,
                                }}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <TextInput
                                            value={item.clean_name}
                                            onChangeText={t => updateItem(index, 'clean_name', t)}
                                            style={{ fontSize: 14, fontWeight: '600', color: C.ink, padding: 0 }}
                                        />
                                        <TextInput
                                            value={item.category}
                                            onChangeText={t => updateItem(index, 'category', t)}
                                            style={{ fontSize: 12, color: C.muted, padding: 0, marginTop: 2 }}
                                        />
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '300', color: C.ghost, marginRight: 2 }}>{CUR_SYM}</Text>
                                        <TextInput
                                            value={Number(item.price || 0).toFixed(2)}
                                            onChangeText={t => updateItem(index, 'price', t)}
                                            keyboardType="decimal-pad"
                                            style={{ fontSize: 14, fontWeight: '700', color: C.ink, padding: 0, minWidth: 44, textAlign: 'right' }}
                                        />
                                        <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 8, marginLeft: 6 }}>
                                            <Text style={{ fontSize: 15, color: C.ghost }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {/* Tax */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: C.muted }}>Tax</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '300', color: C.ghost, marginRight: 2 }}>{CUR_SYM}</Text>
                                    <TextInput
                                        value={taxAmount}
                                        onChangeText={t => {
                                            setTaxAmount(t);
                                            const sub = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
                                            setTotal((sub + Number(t.replace(/[^0-9.]/g, '') || 0)).toFixed(2));
                                        }}
                                        keyboardType="decimal-pad"
                                        style={{ fontSize: 13, fontWeight: '700', color: C.ink, padding: 0, minWidth: 44, textAlign: 'right' }}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                onPress={onClose}
                                style={{
                                    flex: 1, height: 54, borderRadius: 16,
                                    backgroundColor: C.raised,
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 1, borderColor: C.line,
                                }}
                            >
                                <Text style={{ color: C.inkMid, fontWeight: '700', fontSize: 15 }}>Discard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleConfirm}
                                disabled={saving}
                                style={{
                                    flex: 2, height: 54, borderRadius: 16,
                                    backgroundColor: saving ? C.tint : C.emerald,
                                    alignItems: 'center', justifyContent: 'center',
                                    shadowColor: C.emerald,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: saving ? 0 : 0.28,
                                    shadowRadius: 14,
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                                    {saving ? 'Saving…' : data?.isEditingSavedReceipt ? 'Update Receipt' : 'Confirm & Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};
