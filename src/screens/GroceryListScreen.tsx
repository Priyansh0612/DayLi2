import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown } from 'lucide-react-native';
import { groceryService } from '../utils/groceryService';
import { ListSkeleton } from '../components/SkeletonLoaders';
import { supabase } from '../config/supabase';
import { getWeekStartString } from '../components/Home/homeTokens';

interface GroceryItem {
    name: string;
    uniqueKey: string;
    // Add other properties if known, e.g., quantity, unit, etc.
}

export default function GroceryListScreen({ route, navigation }: any) {
    const insets = useSafeAreaInsets();
    const fullPlan = route.params?.fullPlan;
    const mealsData = route.params?.meals || route.params?.currentWeekPlan || [];
    const weekStartString = route.params?.weekStartString || getWeekStartString(new Date());

    const [checkedItems, setCheckedItems] = useState<string[]>([]);

    // 1. Calculate Status and Range (Memoized for stability)
    const { weekStatus, displayRange } = React.useMemo(() => {
        const start = new Date(weekStartString + 'T12:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

        return {
            weekStatus: now < start ? "Next Week's List" : "Current Week's List",
            displayRange: `${start.toLocaleDateString('en-US', options)} — ${end.toLocaleDateString('en-US', options)}`
        };
    }, [weekStartString]);

    // 2. Persistence Logic: Load from Supabase
    useEffect(() => {
        const fetchSavedState = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('weekly_meal_plans')
                    .select('checked_items')
                    .eq('user_id', user.id)
                    .eq('week_start_date', weekStartString)
                    .single();

                if (data?.checked_items) {
                    setCheckedItems(data.checked_items);
                } else {
                    setCheckedItems([]);
                }
            } catch (e) {
                console.log("Error loading checked items from DB:", e);
            }
        };
        fetchSavedState();
    }, [weekStartString]);

    // 3. Generation Logic: Whole Week or Single Day (Memoized to prevent infinite loops)
    const groceryData = React.useMemo(() => {
        const input = fullPlan || mealsData;
        if (!input || (Array.isArray(input) && input.length === 0)) return null;

        console.log("🛒 Calculating Grocery List for:", weekStartString);
        return groceryService.generateSmartList(input);
    }, [weekStartString]);

    const toggleCheck = async (uniqueKey: string) => {
        // A. Update UI Immediately (Optimistic Update)
        const newChecked = checkedItems.includes(uniqueKey)
            ? checkedItems.filter(i => i !== uniqueKey)
            : [...checkedItems, uniqueKey];

        setCheckedItems(newChecked);

        // B. Sync to Supabase
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('weekly_meal_plans')
                .update({ checked_items: newChecked })
                .eq('user_id', user.id)
                .eq('week_start_date', weekStartString);
        } catch (error) {
            console.error("Failed to sync checklist to DB:", error);
        }
    };

    if (!groceryData) {
        return <ListSkeleton />;
    }

    if (Object.keys(groceryData).length === 0) {
        return (
            <View className="flex-1 bg-white justify-center items-center p-6 mt-10">
                <Text className="text-xl font-bold text-gray-800">Cart is Empty</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <View className="flex-1 bg-[#F9F7F2] rounded-t-[32px] overflow-hidden" style={{ paddingTop: insets.top + 10 }}>
                <View className="w-14 h-1.5 bg-gray-300/80 rounded-full self-center mb-6" />

                <View className="px-6 mb-6">
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-3xl font-bold text-[#2C2621]">{weekStatus}</Text>
                        {/* 📅 THE DATE RANGE SUBTITLE */}
                        <Text className="text-sm font-medium text-gray-500 mt-1">
                            {displayRange}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ elevation: 2 }}
                        className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm"
                    >
                        <ChevronDown color="#2C2621" size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                {/* 🟡 THE "ROOMMATE" REMINDER */}
                <View style={{ elevation: 2 }} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex-row items-start shadow-sm">
                    <Text className="text-2xl mr-3">🛒</Text>
                    <View className="flex-1">
                        <Text className="text-amber-900 font-bold text-base">Don't forget the basics!</Text>
                        <Text className="text-amber-800 text-[13px] leading-relaxed">
                            This list only covers your planned meals. Make sure to grab your "survival essentials" like coffee, snacks, or toilet paper while you're out!
                        </Text>
                    </View>
                </View>

                {/* 🟢 THE "BROKE STUDENT" SAVINGS BANNER */}
                <View style={{ elevation: 2 }} className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 mb-8 flex-row items-start shadow-sm">
                    <Text className="text-2xl mr-3">💰</Text>
                    <View className="flex-1">
                        <Text className="text-emerald-900 font-bold text-base">Save some cash?</Text>
                        <Text className="text-emerald-800 text-[13px] leading-relaxed">
                            Before you head to the store, do a quick "cupboard raid." Check off anything you already have (like spices or rice) so you don't buy them twice!
                        </Text>
                    </View>
                </View>
                {/*  THE LIST */}
                {Object.keys(groceryData).sort().map((aisle) => (
                    <View key={aisle} className="mb-6">
                        <View className="bg-gray-200/50 py-1 px-3 rounded-md mb-3 self-start">
                            <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{aisle}</Text>
                        </View>

                        <View className="bg-white rounded-2xl p-2 border border-gray-100">
                            {groceryData[aisle].map((item: any, index: number) => {
                                const isChecked = checkedItems.includes(item.uniqueKey);

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => toggleCheck(item.uniqueKey)}
                                        className="flex-row items-center py-3 px-2 border-b border-gray-50"
                                    >
                                        <View className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-4 ${isChecked ? 'bg-[#D47B5A] border-[#D47B5A]' : 'bg-white border-gray-300'}`}>
                                            {isChecked ? <Check color="white" size={16} strokeWidth={3} /> : null}
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`text-[15px] capitalize flex-1 ${isChecked ? 'text-gray-400 line-through' : 'text-[#2C2621]'}`}>
                                                {item.name}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}
                <View className="h-20" />
            </ScrollView>
            </View>
        </View>
    );
}
