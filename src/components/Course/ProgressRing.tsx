import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withDelay, withTiming, Easing } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ProgressRing = ({ pct, size = 60, strokeWidth = 6, color = '#fff' }: { pct: number, size?: number, strokeWidth?: number, color?: string }) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;

    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withDelay(400, withTiming(pct / 100, { duration: 1000, easing: Easing.out(Easing.exp) }));
    }, [pct]);

    const circumference = 2 * Math.PI * r;
    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - progress.value)
    }));

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
                <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeWidth} />
                <AnimatedCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeLinecap="round" animatedProps={animatedProps} />
            </Svg>
            <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
                <Text className="text-[13px] font-heading" style={{ color }}>{Math.round(pct)}%</Text>
            </View>
        </View>
    );
};
