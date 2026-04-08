import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInDown } from 'react-native-reanimated';
import { Assessment } from '../../types/courseDetails';
import { MUTED, gradeColor } from '../../utils/courseDetailsUtils';

interface AssessmentRowProps {
    item: Assessment;
    index: number;
    onGradeClick: () => void;
    onToggle: () => void;
    theme: any;
}

export const AssessmentRow = ({ item, index, onGradeClick, onToggle, theme }: AssessmentRowProps) => {
    const scale = useSharedValue(1);
    const checked = item.is_completed;
    const pct = item.my_score !== null && item.total_marks ? Math.round((item.my_score / item.total_marks) * 100) : null;

    const rowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <Animated.View entering={FadeInDown.delay(index * 70).duration(400)}>
            <Animated.View style={rowStyle}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPressIn={() => scale.value = withSpring(0.97)}
                    onPressOut={() => scale.value = withSpring(1)}
                    onPress={onGradeClick}
                    style={{
                        flexDirection: "row", alignItems: "center", gap: 14,
                        padding: 14, paddingHorizontal: 16, marginBottom: 10,
                        backgroundColor: checked ? theme.bg : "#fff",
                        borderWidth: 1.5, borderColor: checked ? theme.border : theme.border,
                        borderRadius: 18,
                        shadowColor: checked ? theme.primary : "#000",
                        shadowOffset: { width: 0, height: checked ? 4 : 2 },
                        shadowOpacity: checked ? 0.1 : 0.04, shadowRadius: checked ? 8 : 8, elevation: checked ? 4 : 3,
                    }}
                >
                    <TouchableOpacity
                        onPress={onToggle}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        style={{
                            width: 26, height: 26, borderRadius: 13,
                            borderWidth: 2, borderColor: checked ? theme.primary : theme.border,
                            backgroundColor: checked ? theme.primary : "transparent",
                            alignItems: "center", justifyContent: "center"
                        }}>
                        {checked && <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><Polyline points="20 6 9 17 4 12" /></Svg>}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                        <Text
                            numberOfLines={1}
                            className={`text-[15px] font-heading ${checked ? 'text-slate-400 line-through' : ''}`}
                            style={{ color: checked ? MUTED : theme.text, marginBottom: 4 }}
                        >
                            {item.title}
                        </Text>
                        <View className="flex-row items-center gap-2">
                            <Text className="text-[12px] font-body text-slate-500">
                                {item.due_date ? new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : 'No Date'}
                            </Text>
                            <Text className="text-slate-300 text-[12px]">|</Text>
                            <Text className="text-[10px] font-body-bold text-slate-500 uppercase tracking-widest">
                                {item.type}
                            </Text>
                        </View>
                    </View>

                    <View className="items-end gap-1">
                        {pct !== null ? (
                            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: gradeColor(pct) + "1A" }}>
                                <Text className="text-[13px] font-heading" style={{ color: gradeColor(pct) }}>{pct}%</Text>
                            </View>
                        ) : (
                            item.weight > 0 ? (
                                <View className="bg-slate-100 px-2.5 py-1 rounded-full">
                                    <Text className="text-[12px] font-body-bold text-slate-500">{item.weight}%</Text>
                                </View>
                            ) : null
                        )}
                        {!checked && pct === null && (
                            <Text className="text-[11px] font-body-bold" style={{ color: theme.primary }}>+ Grade</Text>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View >
    );
};
