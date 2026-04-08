import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { C, CategoryIcon, CUR_SYM } from '../../utils/expenseDashboardUtils';

export const TxRow = ({
    tx, cat, isToday, onPress, isLast, hasReceipt, animDelay,
}: {
    tx: any; cat: any; isToday: boolean; onPress: () => void;
    isLast: boolean; hasReceipt?: boolean; animDelay: number;
}) => {
    const slideAnim = useRef(new Animated.Value(12)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (hasAnimated.current) return;
        hasAnimated.current = true;
        Animated.sequence([
            Animated.delay(animDelay),
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, bounciness: 8, useNativeDriver: true }),
            ]),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row', alignItems: 'center',
                    padding: 16, backgroundColor: C.surface,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: C.line,
                }}
            >
                <View style={{ position: 'relative', marginRight: 14 }}>
                    <View style={{
                        width: 44, height: 44, borderRadius: 14,
                        backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center',
                    }}>
                        <CategoryIcon name={cat.icon} size={22} color={C.inkMid} />
                    </View>
                    {hasReceipt && (
                        <View style={{
                            position: 'absolute', top: -2, right: -2,
                            width: 10, height: 10, borderRadius: 5,
                            backgroundColor: C.emerald,
                            borderWidth: 2, borderColor: C.surface,
                        }} />
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink, marginBottom: 2 }}>{tx.title}</Text>
                    <Text style={{ fontSize: 12, color: C.ghost, fontWeight: '500' }}>
                        {cat.label}
                    </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: tx.amount < 0 ? C.emerald : C.ink }}>
                    {tx.amount < 0 ? '+' : '−'}{CUR_SYM}{Math.abs(tx.amount).toFixed(2)}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};
