import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import { ChevronLeft } from 'lucide-react-native';
import { FormSkeleton } from '../components/SkeletonLoaders';

const CUISINE_OPTIONS = [
    'Indian', 'Italian', 'Mexican', 'American', 'Japanese',
    'Chinese', 'Mediterranean', 'Middle Eastern', 'Canadian', 'Korean'
];

export default function DietarySettingsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [mainCuisine, setMainCuisine] = useState<string | null>(null);
    const [secondaryCuisines, setSecondaryCuisines] = useState<string[]>([]);

    // 🟢 1. LOAD EXISTING PREFERENCES ON MOUNT
    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('profiles')
                    .select('main_cuisine, secondary_cuisines')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                // Populate the UI with what's currently in the database
                if (data) {
                    setMainCuisine(data.main_cuisine);
                    setSecondaryCuisines(data.secondary_cuisines || []);
                }
            } catch (error) {
                console.error("Error fetching preferences:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPreferences();
    }, []);

    // 🟢 2. HANDLERS (Same strict rules as Onboarding)
    const handleMainSelect = (cuisine: string) => {
        setMainCuisine(cuisine);
        if (selectedSecondaryCuisinesIncludes(cuisine)) {
            setSecondaryCuisines(prev => prev.filter(c => c !== cuisine));
        }
    };

    const selectedSecondaryCuisinesIncludes = (cuisine: string) => {
        return secondaryCuisines.includes(cuisine);
    };

    const toggleSecondary = (cuisine: string) => {
        if (mainCuisine === cuisine) return;

        if (selectedSecondaryCuisinesIncludes(cuisine)) {
            setSecondaryCuisines(prev => prev.filter(c => c !== cuisine));
        } else {
            if (secondaryCuisines.length >= 3) {
                Alert.alert("Limit Reached", "You can only pick up to 3 secondary cuisines.");
            } else {
                setSecondaryCuisines(prev => [...prev, cuisine]);
            }
        }
    };

    // 🟢 3. SAVE AND UPDATE SUPABASE
    const handleSave = async () => {
        if (!mainCuisine) {
            Alert.alert("Hold up!", "You need to select at least a main cuisine.");
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('profiles')
                .update({
                    main_cuisine: mainCuisine,
                    secondary_cuisines: secondaryCuisines
                })
                .eq('id', user?.id);

            if (error) throw error;

            Alert.alert(
                "Preferences Updated! 🍳",
                "Your new cuisine mix will be applied the next time you generate a weekly meal plan.",
                [{ text: "Awesome", onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert("Error", "Failed to save preferences.");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <FormSkeleton />;
    }

    // 🟢 4. THE UI
    return (
        <View style={{ flex: 1, backgroundColor: '#F9F7F2', paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <View className="px-6 py-4 flex-row items-center border-b border-[#EEEEFB] bg-[#F9F7F2]">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-white rounded-full items-center justify-center border border-[#EEEEFB] shadow-sm -ml-2">
                    <ChevronLeft color="#2C2621" size={20} />
                </TouchableOpacity>
                <Text className="text-[10px] uppercase tracking-[0.2em] font-body-bold text-[#2C2621] ml-4">Dietary Preferences</Text>
            </View>

            <ScrollView className="flex-1 px-8 pt-6" showsVerticalScrollIndicator={false}>
                <Text className="text-4xl font-heading text-[#2C2621] mb-1">Edit Your <Text style={{ color: '#D47B5A' }}>Menu</Text></Text>
                <Text className="text-sm font-body text-[#685D52] mb-10 tracking-wide leading-5">Update your flavor profile for future weeks.</Text>

                {/* MAIN CUISINE */}
                <View className="flex-row items-center gap-2 mb-4">
                    <Text className="text-[10px] uppercase tracking-[0.2em] font-body-bold text-[#A3978B]">Primary Daily</Text>
                    <View className="flex-1 h-[1px] bg-[#2C2621]/10" />
                </View>
                <View className="flex-row flex-wrap gap-3 mb-10">
                    {CUISINE_OPTIONS.map((cuisine) => {
                        const isMain = mainCuisine === cuisine;
                        return (
                            <TouchableOpacity
                                key={`main-${cuisine}`}
                                onPress={() => handleMainSelect(cuisine)}
                                style={{
                                    backgroundColor: isMain ? '#D47B5A' : 'white',
                                    borderColor: isMain ? '#D47B5A' : '#EEEEFB',
                                    borderWidth: 1.5,
                                    borderRadius: 16,
                                    paddingHorizontal: 18,
                                    paddingVertical: 12,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isMain ? 0.12 : 0.04,
                                    shadowRadius: 6,
                                    elevation: 2
                                }}
                            >
                                <Text className={`text-[12px] font-body-bold tracking-wide ${isMain ? 'text-white' : 'text-[#685D52]'}`}>
                                    {cuisine}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* SECONDARY CUISINES */}
                <View className="flex-row items-center gap-2 mb-4">
                    <Text className="text-[10px] uppercase tracking-[0.2em] font-body-bold text-[#A3978B]">Mix it up — Max 3</Text>
                    <View className="flex-1 h-[1px] bg-[#2C2621]/10" />
                </View>
                <View className="flex-row flex-wrap gap-3 mb-12">
                    {CUISINE_OPTIONS.map((cuisine) => {
                        const isMain = mainCuisine === cuisine;
                        const isSecondary = secondaryCuisines.includes(cuisine);

                        return (
                            <TouchableOpacity
                                key={`sec-${cuisine}`}
                                onPress={() => toggleSecondary(cuisine)}
                                disabled={isMain}
                                style={{
                                    backgroundColor: isSecondary ? '#2C2621' : 'white',
                                    borderColor: isSecondary ? '#2C2621' : '#EEEEFB',
                                    borderWidth: 1.5,
                                    borderRadius: 16,
                                    paddingHorizontal: 18,
                                    paddingVertical: 12,
                                    opacity: isMain ? 0.3 : 1,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isSecondary ? 0.12 : 0.04,
                                    shadowRadius: 6,
                                    elevation: 2
                                }}
                            >
                                <Text className={`text-[12px] font-body-bold tracking-wide ${isSecondary ? 'text-white' : 'text-[#685D52]'}`}>
                                    {cuisine}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={{ paddingBottom: Math.max(insets.bottom, 24), paddingTop: 16 }} className="px-6 bg-[#F9F7F2]">
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={{
                        backgroundColor: '#D47B5A',
                        borderRadius: 20,
                        paddingVertical: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#D47B5A',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 10,
                        elevation: 5
                    }}
                >
                    <Text className="text-white font-body-bold text-sm uppercase tracking-[0.1em]">
                        {saving ? 'Saving...' : 'Save Preferences'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
