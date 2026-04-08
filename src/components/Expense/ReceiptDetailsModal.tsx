import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
    Modal, Image, Platform, Dimensions
} from 'react-native';
import { expenseService } from '../../services/expenseService';
import { C, card, Divider, CUR_SYM } from '../../utils/expenseDashboardUtils';

const { width: SW } = Dimensions.get('window');

export const ReceiptDetailsModal = ({
    visible, receiptId, onClose, onEditTransaction,
}: {
    visible: boolean; receiptId: string | null;
    onClose: () => void; onEditTransaction?: (data: any) => void;
}) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [showImage, setShowImage] = useState(false);

    useEffect(() => {
        if (visible && receiptId) {
            setLoading(true); setShowImage(false);
            expenseService.fetchReceiptItems(receiptId)
                .then(setData)
                .finally(() => setLoading(false));
        } else { setData(null); }
    }, [visible, receiptId]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(26,25,22,0.55)', justifyContent: 'center', padding: 20 }}>
                <TouchableOpacity
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    onPress={onClose} activeOpacity={1}
                />
                <View style={[card, { padding: 22, maxHeight: '85%' }]}>
                    {loading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator color={C.emerald} size="large" />
                        </View>
                    ) : data ? (
                        <>
                            {/* Store header */}
                            <View style={{ alignItems: 'center', marginBottom: 18 }}>
                                <Text style={{
                                    fontSize: 20, fontWeight: '800', color: C.ink,
                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                }}>
                                    {data.store_name}
                                </Text>
                                <Text style={{ fontSize: 12, color: C.muted, marginTop: 4, fontWeight: '500' }}>
                                    {new Date(
                                        data.purchase_date.includes('T')
                                            ? data.purchase_date
                                            : `${data.purchase_date}T12:00:00`
                                    ).toLocaleDateString(undefined, {
                                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                    })}
                                </Text>
                                {/* OCR badge */}
                                <View style={{
                                    marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
                                    backgroundColor: C.emeraldLight,
                                    borderWidth: 1, borderColor: C.emerald + '30',
                                    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                                }}>
                                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.emerald }} />
                                    <Text style={{ fontSize: 10, color: C.emerald, fontWeight: '700', letterSpacing: 0.5 }}>
                                        Scanned via OCR
                                    </Text>
                                </View>
                            </View>

                            {/* Toggle */}
                            {data.image_url && (
                                <View style={{
                                    flexDirection: 'row', backgroundColor: C.tint,
                                    borderRadius: 12, padding: 3, marginBottom: 14,
                                    borderWidth: 1, borderColor: C.line,
                                }}>
                                    {[['Items', false], ['Original Photo', true]].map(([label, val]) => (
                                        <TouchableOpacity
                                            key={String(label)}
                                            onPress={() => setShowImage(val as boolean)}
                                            style={{
                                                flex: 1, paddingVertical: 8, alignItems: 'center',
                                                borderRadius: 10,
                                                backgroundColor: showImage === val ? C.surface : 'transparent',
                                                shadowColor: showImage === val ? '#000' : 'transparent',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: 0.05, shadowRadius: 3,
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 13, fontWeight: '600',
                                                color: showImage === val ? C.ink : C.muted,
                                            }}>
                                                {label as string}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {showImage && data.image_url ? (
                                <ScrollView style={{ marginBottom: 18 }} showsVerticalScrollIndicator={false}>
                                    <Image
                                        source={{ uri: data.image_url }}
                                        style={{
                                            width: SW - 88, height: 400, borderRadius: 14,
                                            backgroundColor: C.tint,
                                        }}
                                        resizeMode="contain"
                                    />
                                </ScrollView>
                            ) : (
                                <>
                                    <ScrollView style={{ marginBottom: 18 }} showsVerticalScrollIndicator={false}>
                                        {data.items.map((item: any, idx: number) => (
                                            <View key={idx}>
                                                <View style={{
                                                    flexDirection: 'row', justifyContent: 'space-between',
                                                    paddingVertical: 12,
                                                }}>
                                                    <View style={{ flex: 1, marginRight: 12 }}>
                                                        <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 2 }}>
                                                            {item.clean_name}
                                                        </Text>
                                                        <Text style={{
                                                            fontSize: 10, color: C.ghost,
                                                            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                                        }}>
                                                            {item.original_text}
                                                        </Text>
                                                    </View>
                                                    <Text style={{
                                                        fontSize: 14, fontWeight: '700', color: C.ink,
                                                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                                    }}>
                                                        {CUR_SYM}{(Number(item.price) || 0).toFixed(2)}
                                                    </Text>
                                                </View>
                                                {idx < data.items.length - 1 && <Divider />}
                                            </View>
                                        ))}
                                    </ScrollView>

                                    {/* Totals */}
                                    <View style={{ gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line }}>
                                        {[
                                            { l: 'Subtotal', v: data.subtotal },
                                            { l: 'Tax', v: data.tax_amount },
                                        ].map(row => (
                                            <View key={row.l} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: C.muted, fontWeight: '500', fontSize: 14 }}>{row.l}</Text>
                                                <Text style={{
                                                    color: C.inkMid, fontWeight: '600', fontSize: 14,
                                                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                                }}>
                                                    {CUR_SYM}{(Number(row.v) || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                        ))}
                                        <View style={{
                                            flexDirection: 'row', justifyContent: 'space-between',
                                            alignItems: 'center', marginTop: 8,
                                            paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line,
                                        }}>
                                            <Text style={{ color: C.ink, fontWeight: '700', fontSize: 16 }}>Total</Text>
                                            <Text style={{
                                                color: C.emerald, fontWeight: '800', fontSize: 22,
                                                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                                letterSpacing: -0.5,
                                            }}>
                                                {CUR_SYM}{(Number(data.total_amount) || 0).toFixed(2)}
                                            </Text>
                                        </View>
                                        {data.payment_method && (
                                            <View style={{ marginTop: 14, alignItems: 'center' }}>
                                                <View style={{
                                                    backgroundColor: C.tint, paddingHorizontal: 12,
                                                    paddingVertical: 6, borderRadius: 20,
                                                    borderWidth: 1, borderColor: C.line,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 11, color: C.muted,
                                                        fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1,
                                                    }}>
                                                        Paid with {data.payment_method}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </>
                            )}
                        </>
                    ) : (
                        <Text style={{ textAlign: 'center', color: C.muted, padding: 20 }}>Could not load details.</Text>
                    )}

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                        {onEditTransaction && (
                            <TouchableOpacity
                                onPress={() => { onClose(); onEditTransaction(data); }}
                                style={{
                                    flex: 1, height: 50, borderRadius: 14,
                                    backgroundColor: C.raised,
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 1, borderColor: C.line,
                                }}
                            >
                                <Text style={{ fontWeight: '700', color: C.inkMid, fontSize: 14 }}>Edit</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                flex: 1, height: 50, borderRadius: 14,
                                backgroundColor: C.ink,
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Text style={{ fontWeight: '700', color: '#fff', fontSize: 14 }}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
