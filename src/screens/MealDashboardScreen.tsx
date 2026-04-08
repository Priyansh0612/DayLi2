import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image, ActivityIndicator, Alert, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Home, BookOpen, Briefcase, Utensils, Wallet, Settings, Clock, Flame, ChevronLeft, ChevronRight, RefreshCw, ArrowLeft, ShoppingCart } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { supabase } from '../config/supabase';
// import { mealService } from '../utils/mealService';
import Animated, {
    FadeInDown,
} from 'react-native-reanimated';
import { DashboardSkeleton } from '../components/SkeletonLoaders';
import { getWeekStartString } from '../components/Home/homeTokens';

// --- Date Engine ---
const getWeekData = (weekOffset = 0) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + (weekOffset * 7);
    const monday = new Date(today.setDate(diffToMonday));
    const weekStartString = getWeekStartString(monday);

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const days = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isToday = new Date().toDateString() === date.toDateString();
        days.push({ name: dayNames[i], shortName: dayNames[i].substring(0, 3), dateString: dateString, isToday });
    }
    return { days, weekStartString };
};

const MealDashboardScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    // 1. EXTRACT PASSED DATA
    const passedPlan = route.params?.initialPlan;
    const passedProfile = route.params?.initialProfile;

    const [profile, setProfile] = useState<any>(passedProfile || null);
    const [weeklyPlan, setWeeklyPlan] = useState<any>(null);
    const [dailyMeals, setDailyMeals] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [swappingMeal, setSwappingMeal] = useState<{ day: string, type: string } | null>(null);

    const [weekOffset, setWeekOffset] = useState(0);
    const { days: weekData, weekStartString } = getWeekData(weekOffset);

    const todayData = weekData.find(d => d.isToday);
    const initialDay = todayData ? todayData.name : 'Monday';
    const [selectedDay, setSelectedDay] = useState(initialDay);

    const loadMVPMenu = async (forceRegenerate = false) => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch User Preferences (needed for Regen)
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) setProfile(profileData);

            // 2. Check for existing weekly plan in the CORRECT table
            if (!forceRegenerate) {
                const { data: existingPlan } = await supabase
                    .from('weekly_meal_plans')
                    .select('plan_data')
                    .eq('user_id', user.id)
                    .eq('week_start_date', weekStartString)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingPlan?.plan_data) {
                    console.log("📅 Found existing weekly plan. Loading...");
                    setWeeklyPlan(existingPlan.plan_data);
                    updateDailyView(existingPlan.plan_data, selectedDay);
                    setLoading(false);
                    return;
                }
            }

            console.log("🍳 No plan found for this week. Generating 7-day menu...");

            // 3. Generate New Local Plan utilizing our new unified mealService
            if (profileData) {
                // Make sure to dynamically import mealService at top if it's missing
                const { mealService } = require('../utils/mealService');
                const newPlanData = await mealService.generateStudentWeek(profileData, weekStartString);

                if (newPlanData) {
                    setWeeklyPlan(newPlanData);
                    updateDailyView(newPlanData, selectedDay);
                    console.log("✅ Local Variety-rich Weekly Plan generated & persisted.");
                }
            }

        } catch (error: any) {
            console.log("🚨 Plan Error:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateDailyView = (plan: any, day: string) => {
        if (!plan || !plan[day]) return;
        const dayMeals = [
            { id: 1, type: 'Breakfast', dish: plan[day]?.Breakfast || null },
            { id: 2, type: 'Lunch', dish: plan[day]?.Lunch || null },
            { id: 3, type: 'Dinner', dish: plan[day]?.Dinner || null },
        ].filter(meal => meal.dish !== null); // Hide empty meal slots
        setDailyMeals(dayMeals);
    };

    // 4. Handle Week Changes (The Snap-Back)
    useEffect(() => {
        // Reset to today if returning to offset 0, otherwise default to Monday
        if (weekOffset === 0) {
            const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
            setSelectedDay(weekData[todayIndex].name);
        } else {
            setSelectedDay('Monday');
        }

        loadMVPMenu();
    }, [weekOffset]);

    // 5. Reactive Daily View (No network request)
    useEffect(() => {
        if (weeklyPlan) {
            updateDailyView(weeklyPlan, selectedDay);
        }
    }, [selectedDay, weeklyPlan]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleSwapMeal = async (mealType: string) => {
        console.log(`🔄 SWAP INITIATED for: ${mealType}`);
        setSwappingMeal({ day: selectedDay, type: mealType });

        try {
            const { mealService } = require('../utils/mealService');
            const updatedPlan = await mealService.swapSingleMeal(
                profile,
                selectedDay,
                mealType,
                weeklyPlan,
                weekStartString
            );

            // 🪄 Smooth UI Transition
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

            setWeeklyPlan(updatedPlan);
            updateDailyView(updatedPlan, selectedDay);

            console.log("💾 Swap persisted to JSONB column.");
        } catch (error: any) {
            console.log("🛑 Swap failed:", error.message);
        } finally {
            setSwappingMeal(null);
        }
    };

    const handlePrevWeekPress = () => {
        if (weekOffset > 0) {
            setWeekOffset(prev => prev - 1);
        } else {
            // 🛑 Prevent going to last week if they are new!
            Alert.alert(
                "Fresh Start! 🌱",
                "You just started your DayLi journey this week. Your meal history will build up as you go!",
                [{ text: "Awesome", style: "default" }]
            );
        }
    };

    const isNextWeekAvailable = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday

        // THE FRIDAY FLIP: Unlock next week's menu only on Friday, Saturday, or Sunday.
        return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
    };

    const handleNextWeekPress = () => {
        // 1. Check if we are already looking at 'Next Week' (offset 1)
        if (weekOffset >= 1) {
            Alert.alert(
                "Looking ahead! 🚀",
                "We only plan two weeks at a time to keep ingredients fresh. Check back later for the following week!",
                [{ text: "Got it", style: "cancel" }]
            );
            return;
        }

        // 2. Check if Next Week is even unlocked yet
        if (weekOffset < 0 || isNextWeekAvailable()) {
            setWeekOffset(prev => prev + 1);
        } else {
            Alert.alert(
                "Patience, Chef! 👨‍🍳",
                "We're still perfecting next week's menu. Check back on Friday to see what's cooking!",
                [{ text: "Got it", style: "cancel" }]
            );
        }
    };


    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const isVeg = profile?.diet_type?.includes('Vegetarian') || profile?.diet_type?.includes('Vegan');
    const themeColor = isVeg ? 'text-sage' : 'text-accent';
    const themeBg = isVeg ? 'bg-sage' : 'bg-accent';

    if (loading && dailyMeals.length === 0) {
        return <DashboardSkeleton />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F9F7F2' }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* 🟢 TOP MASTHEAD - REFINED WITH LOGO */}
            <View className="relative overflow-hidden rounded-b-[40px] pb-10 px-8" style={{ paddingTop: insets.top + 14 }}>
                <View style={{ position: 'absolute', inset: 0, backgroundColor: '#F0EBE1' }} />

                {/* 🟢 Mesh Orb (Terracotta) */}
                <View style={{ position: 'absolute', top: -40, right: -20, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(212, 123, 90, 0.15)' }} />

                <BlurView intensity={50} tint="light" style={{ position: 'absolute', inset: 0 }} />

                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 30,
                    height: 48,
                    zIndex: 10
                }}>
                    {/* 1. ACTUAL BACK ARROW */}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        className="w-10 h-10 items-center justify-center"
                        style={{ zIndex: 12 }}
                    >
                        <ArrowLeft size={26} color="#2C2621" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* ── DayLi Brand Lockup: MEALS ── */}
                    <View style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 11
                    }} pointerEvents="none">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ color: '#D47B5A', fontWeight: '800', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                Meals
                            </Text>
                        </View>
                    </View>

                    {/* 3. SETTINGS ICON */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('DietarySettings')}
                        className="w-10 h-10 items-center justify-center"
                        style={{ zIndex: 12 }}
                    >
                        <Settings color="#2C2621" size={20} strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* 🟢 ALIGNED TEXT SECTION */}
                <View className="relative z-10">
                    {/* Added ml-2 to the title to align with the subtext below */}
                    <Text className="text-[52px] text-[#2C2621] font-heading leading-none tracking-tight ml-2">
                        {selectedDay}
                    </Text>
                    <Text className="text-[10px] text-[#685D52] uppercase tracking-[0.2em] mt-3 font-body-bold ml-2">
                        {weekStartString} · {profile?.diet_type || 'Vegetarian'}
                    </Text>

                    {/* 🟢 GROCERY HANDOFF BUTTON */}
                    {weeklyPlan && (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('GroceryList', {
                                // Pass the plan currently stored in state for THIS week
                                fullPlan: weeklyPlan,
                                // Pass the string for the MONDAY of the week being viewed
                                weekStartString: weekStartString
                            })}
                            className="bg-[#D47B5A] flex-row items-center justify-center py-4 rounded-2xl shadow-lg mt-8"
                            style={{ elevation: 6 }}
                        >
                            <ShoppingCart color="white" size={20} />
                            <Text className="text-white font-body-bold ml-2 uppercase tracking-widest text-[12px]">
                                Generate {weekOffset === 0 ? "This Week's" : "Next Week's"} List
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>


            <ScrollView className="flex-1 pt-2" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                {/* 🟢 MEAL LIST HEADER + WEEK NAVIGATION */}
                <View className="px-8 mt-8 mb-4 flex-row justify-between items-center">
                    <View>
                        <Text className="text-lg font-heading text-[#2C2621]">
                            Menu for <Text className="text-[#D47B5A]">{selectedDay}</Text>
                        </Text>
                        {/* Shows which week we are looking at */}
                        <Text className="text-[9px] font-body-bold text-[#A3978B] uppercase tracking-widest mt-0.5">
                            Week of {weekData?.[0]?.dateString}
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-4">
                        {/* Previous Week */}
                        <TouchableOpacity
                            onPress={handlePrevWeekPress}
                            className="w-8 h-8 items-center justify-center bg-[#2C2621]/5 rounded-full"
                        >
                            <ChevronLeft size={18} color="#A3978B" />
                        </TouchableOpacity>

                        {/* Next Week */}
                        <TouchableOpacity
                            onPress={handleNextWeekPress}
                            className="w-8 h-8 items-center justify-center bg-[#2C2621]/5 rounded-full"
                        >
                            <ChevronRight size={18} color="#A3978B" />
                        </TouchableOpacity>

                        {/* Regen Button (Separator line for clarity) */}
                        <View className="w-[1px] h-4 bg-[#2C2621]/10 mx-1" />

                        <TouchableOpacity onPress={() => loadMVPMenu(true)} className="flex-row items-center gap-1.5">
                            <RefreshCw color="#A3978B" size={12} />
                            <Text className="text-[10px] text-[#A3978B] font-body-bold uppercase tracking-widest">Regen</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 🟢 THE SMART GROCERY BANNER */}
                {/* The {weeklyPlan && ...} logic ensures this banner is completely invisible if they haven't generated meals yet. */}
                {/* Hidden Grocery Banner for now as it needs rewiring */}

                {/* 🟢 DAY STRIP */}
                <View className="flex-row px-6 mb-6">
                    {weekData.map((dayObj, index) => {
                        const isSelected = selectedDay === dayObj.name;

                        // 1. Identify if the day is in the past (only for the current week)
                        const isPastDay = weekOffset === 0 && index < currentDayIndex;

                        return (
                            <TouchableOpacity
                                key={dayObj.name}
                                onPress={() => setSelectedDay(dayObj.name)}
                                // 2. Disable the button if it's a past day
                                disabled={isPastDay}
                                className={`flex-1 items-center py-3 border-b-2 ${isSelected ? 'border-[#D47B5A]' : 'border-transparent'} ${isPastDay ? 'opacity-30' : 'opacity-100'}`}
                            >
                                <Text className={`text-[10px] uppercase tracking-widest font-body-bold ${isSelected ? 'text-[#2C2621]' : 'text-[#A3978B]'}`}>{dayObj.shortName[0]}</Text>
                                <Text className={`text-xs mt-1 ${isSelected ? 'text-[#2C2621] font-body-bold' : 'text-[#685D52] font-body'}`}>{dayObj.dateString.split(' ')[1]}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 🟢 MEAL LIST */}
                <View className="px-6 gap-0">
                    {/* CASE 1: Future week is locked */}
                    {weekOffset === 1 && !isNextWeekAvailable() ? (
                        <View className="py-20 px-10 items-center justify-center">
                            <Text className="text-4xl mb-6">🥣</Text>
                            <Text className="font-heading text-2xl text-[#2C2621] text-center mb-2">Almost there... 🥣</Text>
                            <Text className="font-body text-[#A3978B] text-center leading-5">
                                We usually release next week's menu on Friday. Take this time to enjoy your current meals!
                            </Text>
                        </View>
                    ) :
                        /* CASE 2: Fresh Start - User joined today, trying to look at earlier this week */
                        (weekOffset === 0 && weekData.findIndex(d => d.name === selectedDay) < currentDayIndex) ? (
                            <View className="py-20 px-10 items-center justify-center">
                                <Text className="text-4xl mb-6">🌱</Text>
                                <Text className="font-heading text-2xl text-[#2C2621] text-center mb-2">New Beginnings! 🌱</Text>
                                <Text className="font-body text-[#A3978B] text-center leading-5" style={{ lineHeight: 20 }}>
                                    Your culinary journey started today! History will start building up from this week onwards.
                                </Text>
                            </View>
                        ) :
                            /* CASE 3: Show the Meals */
                            dailyMeals && dailyMeals.length > 0 ? (
                                <>
                                    {dailyMeals.map((mealItem, i) => {
                                        const { type: mealType, dish } = mealItem;
                                        if (!dish) return null;

                                        return (
                                            <Animated.View key={`${selectedDay}-${mealType}`} entering={FadeInDown.delay(i * 80)}>
                                                <TouchableOpacity
                                                    onPress={() => navigation.navigate('MealRecipeDetail', {
                                                        meal: dish, // Passing the whole Supabase row
                                                        mealType: mealType
                                                    })}
                                                    activeOpacity={0.9}
                                                    style={{
                                                        backgroundColor: '#fff',
                                                        borderRadius: 22,
                                                        borderWidth: 1.5,
                                                        borderColor: '#EEEEFB',
                                                        shadowColor: '#000',
                                                        shadowOffset: { width: 0, height: 6 },
                                                        shadowOpacity: 0.04,
                                                        shadowRadius: 16,
                                                        elevation: 3,
                                                        flexDirection: 'row',
                                                        overflow: 'hidden',
                                                        marginBottom: 16,
                                                        height: 110
                                                    }}
                                                >
                                                    <Image
                                                        source={{ uri: dish.image_url }}
                                                        style={{ width: 110, height: '100%' }}
                                                    />
                                                    <View style={{ flex: 1, padding: 14, justifyContent: 'center' }}>
                                                        <View className="flex-row justify-between items-center mb-1">
                                                            <Text className="text-[10px] font-body-bold text-[#D47B5A] uppercase tracking-widest">
                                                                {mealType}
                                                            </Text>
                                                            <TouchableOpacity
                                                                onPress={() => handleSwapMeal(mealType)}
                                                                disabled={swappingMeal?.type === mealType}
                                                                className="w-8 h-8 items-center justify-center bg-[#F9F7F2] rounded-full border border-[#EEEEFB]"
                                                            >
                                                                {swappingMeal?.type === mealType ? (
                                                                    <ActivityIndicator size="small" color="#D47B5A" />
                                                                ) : (
                                                                    <RefreshCw color="#A3978B" size={14} />
                                                                )}
                                                            </TouchableOpacity>
                                                        </View>

                                                        <Text className="font-heading text-[#2C2621] text-[16px] leading-tight mb-2" numberOfLines={2}>
                                                            {dish.dish_name}
                                                        </Text>

                                                        <View className="flex-row items-center gap-4">
                                                            <View className="flex-row items-center gap-1">
                                                                <Clock size={12} color="#A3978B" />
                                                                <Text className="text-[11px] font-body-bold text-[#685D52]">{dish.prep_time_minutes}m</Text>
                                                            </View>
                                                            <View className="flex-row items-center gap-1">
                                                                <Wallet size={12} color="#A3978B" />
                                                                <Text className="text-[11px] font-body-bold text-[#685D52]">Budget: {dish.budget_score}/3</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            </Animated.View>
                                        );
                                    })}
                                </>
                            ) : (
                                <View className="py-12 items-center opacity-50">
                                    <Text className="text-xl font-heading text-[#2C2621] mb-2">Curating Menu...</Text>
                                    <ActivityIndicator size="small" color="#D47B5A" />
                                </View>
                            )}
                </View>
            </ScrollView>

        </View>
    );
};

export default MealDashboardScreen;
