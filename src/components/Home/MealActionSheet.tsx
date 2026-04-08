import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Utensils, Clock, AlertCircle } from 'lucide-react-native';
import { C } from './homeTokens';

// ─── Meal Action Sheet ─────────────────────────────────────────
const MealActionSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    mealItem: any;
    onSkip: (mealId: string) => void;
    onAdjustTime: (meal: any) => void;
}> = ({ visible, onClose, mealItem, onSkip, onAdjustTime }) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

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

    if (!mealItem) return null;

    return (
        <View pointerEvents={visible ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 400, justifyContent: 'flex-end' }}>
            <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(26,25,22,0.42)', opacity: fadeAnim }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
            </Animated.View>
            <Animated.View style={{ backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : Math.max(insets.bottom + 20, 28), shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.14, shadowRadius: 36, elevation: 20, transform: [{ translateY: slideAnim }] }}>

                <View style={{ width: 34, height: 4, borderRadius: 4, backgroundColor: C.line, alignSelf: 'center', marginBottom: 18 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.mealL, borderWidth: 1, borderColor: C.mealM, alignItems: 'center', justifyContent: 'center' }}>
                        <Utensils size={20} color={C.meal} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.primary }}>
                            {mealItem.title.split(' — ')[0]}
                        </Text>
                        <Text style={{ fontSize: 13, color: C.meal, fontWeight: '600' }} className="font-body-bold">
                            {mealItem.title.split(' — ')[1]}
                        </Text>
                    </View>
                </View>

                <Text style={{ fontSize: 12, color: C.muted, fontWeight: '500', marginBottom: 20, paddingLeft: 52 }} className="font-body">
                    Scheduled for {mealItem.time}
                </Text>

                {/* Edit Time Button */}
                <TouchableOpacity
                    onPress={() => {
                        onAdjustTime(mealItem);
                        onClose();
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, marginBottom: 10 }}
                    activeOpacity={0.7}
                >
                    <Clock size={18} color={C.ink} strokeWidth={2} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }} className="font-body-bold">Adjust Time</Text>
                </TouchableOpacity>

                {/* Skip Meal Button */}
                <TouchableOpacity
                    onPress={() => onSkip(mealItem.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 18, backgroundColor: 'rgba(220,38,38,0.05)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)' }}
                    activeOpacity={0.7}
                >
                    <AlertCircle size={18} color={C.red} strokeWidth={2} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.red }} className="font-body-bold">Skip this meal</Text>
                </TouchableOpacity>

            </Animated.View>
        </View>
    );
};

export default MealActionSheet;
