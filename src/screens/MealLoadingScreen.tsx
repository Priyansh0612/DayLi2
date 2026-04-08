import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
// import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming,
    Easing, withSequence, useAnimatedProps, FadeIn, FadeOut, SlideInDown
} from 'react-native-reanimated';
import { supabase } from '../config/supabase';
import { mealService } from '../utils/mealService';
import { getWeekStartString } from '../components/Home/homeTokens';

const { width, height } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const PHOTOS = [
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500&q=70',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=70',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=70'
];

const LOADING_PHRASES = [
    "Curating your menu...",
    "Crafting your week...",
    "Almost at the table..."
];

const MealLoadingScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    // --- State ---
    const [photoIdx, setPhotoIdx] = useState(0);
    const [phraseIdx, setPhraseIdx] = useState(0);
    const [stepMealsDone, setStepMealsDone] = useState(false);
    const [stepAllDone, setStepAllDone] = useState(false);

    // --- Animations ---
    const rotation = useSharedValue(0);
    const pulseWidth = useSharedValue(1.5);
    const progressWidth = useSharedValue(0);

    useEffect(() => {
        // 1. Start the SVG Ring Rotation (Slow, continuous 8-second spin)
        rotation.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }),
            -1, false
        );

        // 2. Start the SVG Ring Pulse (Breathing effect on the stroke width)
        pulseWidth.value = withRepeat(
            withSequence(
                withTiming(3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(1.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1, true
        );

        // 3. Progress Bar Animation
        progressWidth.value = withTiming(width - 52, { duration: 4500, easing: Easing.inOut(Easing.ease) });

        // --- Timers for UI Simulation ---

        // Cycle background photos every 2.5 seconds
        const photoInterval = setInterval(() => {
            setPhotoIdx((prev) => (prev + 1) % PHOTOS.length);
        }, 2500);

        // Cycle text phrases every 2 seconds
        const phraseInterval = setInterval(() => {
            setPhraseIdx((prev) => (prev < LOADING_PHRASES.length - 1 ? prev + 1 : prev));
        }, 2000);

        // 🟢 Inside MealLoadingScreen.tsx useEffect
        const generateInitialMeals = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileData) {
                    const today = new Date();
                    const dayOfWeek = today.getDay();
                    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                    const monday = new Date(today.setDate(diffToMonday));
                    const weekStartString = getWeekStartString(monday);

                    setStepMealsDone(true);

                    // 🟢 CAPTURE THE GENERATED PLAN
                    const newPlan = await mealService.generateStudentWeek(profileData, weekStartString);
                    setStepAllDone(true);

                    // 🟢 PASS THE DATA DIRECTLY TO THE DASHBOARD
                    setTimeout(() => {
                        navigation.replace('MealDashboard', {
                            initialPlan: newPlan,
                            initialProfile: profileData
                        });
                    }, 500); // Small half-second delay so they see the "Done" checkmark
                }
            } catch (error) {
                console.error("Error generating initial meals:", error);
                navigation.replace('MealDashboard'); // Fallback
            }
        };

        generateInitialMeals();

        return () => {
            clearInterval(photoInterval);
            clearInterval(phraseInterval);
        };
    }, []);

    // --- Reanimated Styles ---
    const svgStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
    }));

    const arcProps = useAnimatedProps(() => ({
        strokeWidth: pulseWidth.value
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: progressWidth.value
    }));

    return (
        <View className="flex-1 bg-cream">
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* 🟢 BACKGROUND PHOTOS (Blurred & Fading) */}
            <View className="absolute inset-0">
                {PHOTOS.map((uri, index) => (
                    index === photoIdx && (
                        <Animated.Image
                            key={uri}
                            source={{ uri }}
                            className="absolute inset-0 w-full h-full opacity-60"
                            entering={FadeIn.duration(1000)}
                            exiting={FadeOut.duration(1000)}
                        />
                    )
                ))}
            </View>

            {/* Frost Overlay */}
            <BlurView intensity={30} tint="light" className="absolute inset-0 bg-cream/40" />

            {/* Gradients to ensure text is readable at the top and bottom */}
            <LinearGradient colors={['#F9F7F2', 'transparent']} style={styles.topFade} />
            <LinearGradient colors={['transparent', 'rgba(249,247,242,0.85)', '#F9F7F2']} style={styles.botFade} />

            {/* 🟢 THE PULSING SVG RING */}
            <View className="absolute inset-0 items-center justify-center -mt-20">
                <AnimatedSvg width={240} height={240} viewBox="0 0 240 240" style={svgStyle}>
                    {/* Background faint circle */}
                    <Circle cx="120" cy="120" r="100" stroke="rgba(44,38,33,0.15)" strokeWidth="1" fill="none" />
                    {/* Pulsing Accent Arc */}
                    <AnimatedCircle
                        cx="120" cy="120" r="100"
                        stroke="#D47B5A" // Accent color (Warm Clay)
                        fill="none"
                        strokeDasharray="120 634"
                        strokeLinecap="round"
                        animatedProps={arcProps}
                    />
                </AnimatedSvg>
            </View>

            {/* 🟢 BOTTOM CONTENT BLOCK */}
            <View
                style={{ paddingBottom: Math.max(insets.bottom, 48) }}
                className="absolute bottom-0 left-0 right-0 px-6 items-center z-10"
            >

                {/* Title */}
                <Animated.Text entering={SlideInDown.duration(800)} className="font-heading text-6xl italic text-ink mb-1 tracking-tight">
                    Nourish
                </Animated.Text>

                {/* Tagline */}
                <Animated.Text entering={SlideInDown.duration(800).delay(100)} className="text-[9px] uppercase tracking-[0.25em] text-ghost font-body-bold mb-8">
                    Alive Kitchen · Building Your Week
                </Animated.Text>

                {/* Cycling Phrases */}
                <View className="h-6 overflow-hidden mb-6 items-center w-full relative">
                    {LOADING_PHRASES.map((phrase, index) => (
                        index === phraseIdx && (
                            <Animated.Text
                                key={phrase}
                                entering={SlideInDown.duration(500)}
                                exiting={FadeOut.duration(300)}
                                className="absolute text-sm font-heading italic text-inkMuted"
                            >
                                {phrase}
                            </Animated.Text>
                        )
                    ))}
                </View>

                {/* Progress Bar Line */}
                <View className="w-full h-[2px] bg-ink/5 mb-6 rounded-full overflow-hidden">
                    <Animated.View className="h-full bg-accent" style={progressStyle} />
                </View>

                {/* Status Checkmarks */}
                <View className="flex-row justify-center items-center gap-4 w-full">
                    <StatusStep label="Diet" isDone={true} />
                    <StatusStep label="Allergies" isDone={true} />
                    <StatusStep label="Meals" isDone={stepMealsDone} />
                    <StatusStep label="Done" isDone={stepAllDone} />
                </View>

            </View>
        </View>
    );
};

// --- Helper Component for the little steps at the bottom ---
const StatusStep = ({ label, isDone }: { label: string, isDone: boolean }) => (
    <View className="flex-row items-center gap-1.5">
        <View className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-accent' : 'bg-ink/15'}`} />
        <Text className={`text-[8px] uppercase tracking-[0.1em] font-body-bold ${isDone ? 'text-ink' : 'text-ghost'}`}>
            {label}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    topFade: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '30%',
        zIndex: 2
    },
    botFade: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '55%',
        zIndex: 2
    }
});

export default MealLoadingScreen;
