import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// ─── Progress Ring ────────────────────────────────────────────
const ProgressRing: React.FC<{
    size: number; stroke: number; pct: number;
    color: string; trackColor: string; children?: React.ReactNode;
}> = ({ size, stroke, pct, color, trackColor, children }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const off = circ - (pct / 100) * circ;
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
                <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={circ} strokeDashoffset={off}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            {children && (
                <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                    {children}
                </View>
            )}
        </View>
    );
};

export default ProgressRing;
