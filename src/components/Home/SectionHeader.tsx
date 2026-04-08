import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from './homeTokens';

// ─── Section Header ───────────────────────────────────────────
const SectionHeader: React.FC<{
    title: string; actionLabel?: string; actionColor?: string; onAction?: () => void;
}> = ({ title, actionLabel, actionColor = C.academic, onAction }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 11 }}>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.primary }}>{title}</Text>
        {actionLabel && (
            <TouchableOpacity onPress={onAction}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: actionColor, opacity: 0.8 }}>
                    {actionLabel} →
                </Text>
            </TouchableOpacity>
        )}
    </View>
);

export default SectionHeader;
