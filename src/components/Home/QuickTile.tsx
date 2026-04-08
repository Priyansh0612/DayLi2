import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { titaniumCard } from './homeTokens';

// ─── Quick Action Tile ────────────────────────────────────────
const QuickTile: React.FC<{
    label: string; accentColor: string;
    icon: React.ReactNode; onPress: () => void;
}> = ({ label, accentColor, icon, onPress }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const onIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
    return (
        <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1} style={{ flex: 1 }}>
            <Animated.View style={[{ borderRadius: 18, paddingVertical: 14, alignItems: 'center', gap: 8, transform: [{ scale }] }, titaniumCard, { shadowOpacity: 0, elevation: 0 }]}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${accentColor}22`, borderWidth: 1, borderColor: `${accentColor}44`, alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: accentColor, textAlign: 'center', lineHeight: 14, includeFontPadding: false, textAlignVertical: 'center' }} className="font-body-bold">{label}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

export default QuickTile;
