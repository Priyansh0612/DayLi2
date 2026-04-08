import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StatusBar, ScrollView, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react-native';

// const EDAMAM_APP_ID = process.env.EXPO_PUBLIC_EDAMAM_APP_ID;
// const EDAMAM_APP_KEY = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY;

interface DishImage {
    id: string; // the dish_cache id
    region_tag: string;
    dish_name: string;
    imageUrl: string | null;
}

const DIETS = [
    { label: 'Classic (Everything)', value: 'Classic' },
    { label: 'Vegetarian', value: 'Vegetarian' },
    { label: 'Vegan', value: 'Vegan' },
    { label: 'Pescatarian', value: 'Pescatarian' }, // Note: matches 'pescatarian' in DB
    { label: 'Eggetarian', value: 'Eggetarian' }
];

const ALLERGIES = [
    'Dairy',
    'Gluten',
    'Nuts',
    'Soy',
    'Eggs',
    'Peanuts',
    'Tree nuts',
    'Fish',
    'Shellfish',
    'Molluscs',
    'Sesame',
    'Mustard',
    'Celery',
    'Sulphites'
];

const CUISINES = [
    { label: 'North American Comfort', value: 'North American', regions: ['american', 'global', 'canadian'] }, // 'canadian' is a legacy safe-word just in case
    { label: 'Indian & South Asian', value: 'Indian', regions: ['indian', 'pakistani'] },
    { label: 'Italian & Mediterranean', value: 'Italian', regions: ['italian', 'greek', 'spanish'] },
    { label: 'Middle Eastern & North African', value: 'Middle Eastern', regions: ['middle_eastern', 'lebanese', 'israeli', 'egyptian', 'moroccan', 'iranian'] },
    { label: 'East Asian Comfort', value: 'East Asian', regions: ['asian', 'chinese', 'japanese', 'korean'] },
    { label: 'Southeast Asian', value: 'Southeast Asian', regions: ['vietnamese', 'filipino'] },
    { label: 'Mexican & Latin American', value: 'Mexican', regions: ['mexican', 'argentine', 'peruvian'] },
    { label: 'African Heritage', value: 'African', regions: ['african', 'ethiopian', 'south_african'] },
    { label: 'European Classics', value: 'European', regions: ['french', 'eastern_european'] }
];

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = (screenWidth - (48 + (numColumns - 1) * 8)) / numColumns; // 48 is total horizontal padding (24 * 2), 8 is gap

const MealOnboardingScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const [step, setStep] = useState(1);

    // Step 1 - 4 state
    const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
    const [selectedMainCuisine, setSelectedMainCuisine] = useState<string | null>(null);
    const [selectedSecondaryCuisine, setSelectedSecondaryCuisine] = useState<string | null>(null);

    // Step 3 state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dishes, setDishes] = useState<DishImage[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (step === 5) {
            loadVisualGrid();
        }
    }, [step]);

    const loadVisualGrid = async () => {
        try {
            setLoading(true);
            console.log("🥘 Loading MVP Visual Grid...");

            // 1. Helper to fetch safe dishes for a given set of regions
            const fetchSafeDishes = async (regions: string[], limit: number) => {
                let query = supabase
                    .from('production_meals')
                    .select('id, dish_name, region_tag, image_url')
                    .not('image_url', 'is', null) // ONLY fetch dishes that have images
                    .in('region_tag', regions)
                    .limit(limit);

                // Apply the Diet Filter natively!
                if (selectedDiet && selectedDiet !== 'None' && selectedDiet !== 'Classic (Everything)') {
                    query = query.contains('dietary_tags', `["${selectedDiet.toLowerCase()}"]`);
                }

                // Apply the Allergy Filter natively!
                // Exclude any row where the dish's allergens array overlaps with the user's allergy array
                if (selectedAllergies.length > 0) {
                    const lowerCaseAllergies = selectedAllergies.map(a => a.toLowerCase());
                    query = query.not('allergens', 'cs', JSON.stringify(lowerCaseAllergies));
                }

                const { data, error } = await query;
                if (error) throw error;
                return data || [];
            };

            const main = CUISINES.find(c => c.value === selectedMainCuisine);
            const secondary = CUISINES.find(c => c.value === selectedSecondaryCuisine);

            const mainRegions = main ? main.regions : ['universal', 'canadian'];

            // 2. Try fetching from Main Cuisine first
            let safeDishes = await fetchSafeDishes(mainRegions, 15);

            // 3. The Fallback Plan (Secondary Cuisine)
            // If the database returns fewer than 6 dishes for their Main Cuisine, 
            // automatically pull dishes from Secondary Cuisine directly to fill out the rest.
            if (safeDishes.length < 6 && secondary) {
                console.log(`⚠️ Only found ${safeDishes.length} dishes for Main Cuisine. Pulling from Secondary cuisine: ${secondary.label}`);
                const needed = 15 - safeDishes.length;
                const secondaryDishes = await fetchSafeDishes(secondary.regions, needed);

                // Combine and deduplicate
                const existingIds = new Set(safeDishes.map(d => d.id));
                for (const dish of secondaryDishes) {
                    if (!existingIds.has(dish.id)) {
                        safeDishes.push(dish);
                    }
                }
            }

            if (safeDishes && safeDishes.length > 0) {
                // Shuffle them so the grid looks fresh every time
                const shuffled = safeDishes.sort(() => 0.5 - Math.random());

                // Format for your UI
                const formattedDishes = shuffled.map(dish => ({
                    id: dish.id,
                    region_tag: dish.region_tag,
                    dish_name: dish.dish_name,
                    imageUrl: dish.image_url
                }));

                setDishes(formattedDishes);
                console.log(`✅ Instantly loaded ${formattedDishes.length} safe, perfect dishes.`);
            } else {
                console.log("🤷‍♂️ No dishes matched those exact strict filters. Falling back to universal safety...");
                // If they are so strict we have 0 hits, pull from the universal bunker (no allergies)
                const { data: bunkerDishes } = await supabase
                    .from('production_meals')
                    .select('id, dish_name, region_tag, image_url')
                    .or('allergens.eq.[],allergens.eq.{}') // Empty array means no allergens
                    .limit(6);

                if (bunkerDishes) {
                    setDishes(bunkerDishes.map(d => ({
                        id: d.id, region_tag: d.region_tag, dish_name: d.dish_name, imageUrl: d.image_url
                    })));
                }
            }

        } catch (error: any) {
            console.log("🚨 Visual Grid Error: ", error.message);
            Alert.alert("Error", "Could not load dishes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleAllergy = (allergy: string) => {
        if (selectedAllergies.includes(allergy)) {
            setSelectedAllergies(prev => prev.filter(a => a !== allergy));
        } else {
            setSelectedAllergies(prev => [...prev, allergy]);
        }
    };

    const toggleDishSelection = (dishId: string) => {
        if (selectedIds.includes(dishId)) {
            setSelectedIds(prev => prev.filter(id => id !== dishId));
        } else {
            if (selectedIds.length >= 3) {
                // Auto-replace the oldest one if they click a 4th (FIFO)
                setSelectedIds(prev => [...prev.slice(1), dishId]);
            } else {
                setSelectedIds(prev => [...prev, dishId]);
            }
        }
    };

    const handleNextStep = () => {
        if (step === 1 && !selectedDiet) return Alert.alert("Wait!", "Please select a diet type.");
        if (step === 3 && !selectedMainCuisine) return Alert.alert("Wait!", "Please select your primary cuisine.");
        setStep(step + 1);
    };

    const handleFinish = async () => {
        if (selectedIds.length !== 3) {
            Alert.alert("Almost there!", "Please pick exactly 3 dishes that make you hungry.");
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User session invalid.");

            // Extract the implicit region tags from the selected dishes
            const selectedDishes = dishes.filter(d => selectedIds.includes(d.id));
            const tasteProfile = selectedDishes.map(d => d.region_tag);

            // Save completely
            const { error } = await supabase.from('profiles').update({
                diet_type: selectedDiet,
                allergies: selectedAllergies,
                taste_profile: tasteProfile,
                main_cuisine: selectedMainCuisine || "Global" // Update with actual cuisine
            }).eq('id', user.id);

            if (error) throw error;
            navigation.replace('MealLoading');

        } catch (error: any) {
            Alert.alert("Save Failed", error.message);
        } finally {
            setSaving(false);
        }
    };

    const stepLabels = ['Choose diet', 'Flag allergies', 'Main Cuisine', 'Secondary Cuisine', 'Visual tasting'];

    return (
        <View style={{ flex: 1, backgroundColor: '#F9F7F2', paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* Top Navigation Wrapper - Keeps header in place for scrolling */}
            <View className="z-20 bg-[#F9F7F2]">
                <View className="h-[2px] bg-[#2C2621]/5 w-full absolute top-0 z-20">
                    <View className="h-full bg-[#D47B5A]" style={{ width: `${(step / 5) * 100}%` }} />
                </View>

                <View className="px-6 pt-4 pb-2 flex-row justify-between items-center z-10">
                    <TouchableOpacity 
                        onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} 
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        style={{ zIndex: 12, marginBottom: 10 }}
                    >
                        <ArrowLeft color="#2C2621" size={26} strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* STEP COUNTER */}
                <View className="px-8 pt-2 mb-6">
                    <Text className="font-heading text-7xl text-[#2C2621]/20 -mb-3 tracking-tighter">0{step}</Text>
                    <Text className="text-[9px] uppercase tracking-[0.22em] text-[#A3978B] font-body-bold">{stepLabels[step - 1]}</Text>
                </View>
            </View>

            {/* 🟢 STEP 1: DIET */}
            {step === 1 && (
                <ScrollView className="flex-1 px-8" showsVerticalScrollIndicator={false}>
                    <Text className="text-4xl font-heading text-[#2C2621] mb-1">How do you <Text style={{ color: '#D47B5A' }}>eat?</Text></Text>
                    <Text className="text-sm font-body text-[#685D52] mb-8 tracking-wide leading-5">Your hardware constraint.</Text>

                    <View className="mb-12">
                        {DIETS.map((diet) => {
                            const isSelected = selectedDiet === diet.value;
                            return (
                                <TouchableOpacity
                                    key={diet.value}
                                    onPress={() => setSelectedDiet(diet.value)}
                                    className={`flex-row items-center justify-between py-4 border-b border-[#2C2621]/5 ${isSelected ? 'bg-[#D47B5A]/5 -mx-4 px-4 rounded-lg border-b-transparent' : ''}`}
                                >
                                    <Text className={`text-base ${isSelected ? 'font-body-bold text-[#D47B5A]' : 'font-body text-[#685D52]'}`}>
                                        {diet.label}
                                    </Text>
                                    <View className={`w-5 h-5 rounded-full border flex-items-center justify-center ${isSelected ? 'bg-[#D47B5A] border-[#D47B5A]' : 'border-[#2C2621]/20'}`}>
                                        {isSelected && <View className="w-2 h-2 bg-white rounded-full" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {/* 🟢 STEP 2: ALLERGIES */}
            {step === 2 && (
                <ScrollView className="flex-1 px-8" showsVerticalScrollIndicator={false}>
                    <Text className="text-4xl font-heading text-[#2C2621] mb-1">Any <Text style={{ color: '#D47B5A' }}>allergies?</Text></Text>
                    <Text className="text-sm font-body text-[#685D52] mb-8 tracking-wide leading-5">We'll never use these. Ever.</Text>

                    <View className="flex-row flex-wrap gap-3 mb-12">
                        {ALLERGIES.map((allergy) => {
                            const isSelected = selectedAllergies.includes(allergy);
                            return (
                                <TouchableOpacity
                                    key={allergy}
                                    onPress={() => toggleAllergy(allergy)}
                                    style={{
                                        backgroundColor: isSelected ? '#D47B5A' : 'white',
                                        borderColor: isSelected ? '#D47B5A' : '#EEEEFB',
                                        borderWidth: 1.5,
                                        borderRadius: 16,
                                        paddingHorizontal: 20,
                                        paddingVertical: 12,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: isSelected ? 0.12 : 0.04,
                                        shadowRadius: 6,
                                        elevation: 2
                                    }}
                                >
                                    <Text className={`text-[13px] font-body-bold tracking-wide ${isSelected ? 'text-white' : 'text-[#685D52]'}`}>
                                        {allergy}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {/* 🟢 STEP 3: MAIN CUISINE */}
            {step === 3 && (
                <ScrollView className="flex-1 px-8" showsVerticalScrollIndicator={false}>
                    <Text className="text-4xl font-heading text-[#2C2621] mb-1">Favorite <Text style={{ color: '#D47B5A' }}>cuisine?</Text></Text>
                    <Text className="text-sm font-body text-[#685D52] mb-8 tracking-wide leading-5">Your absolute favorite foundation.</Text>

                    <View className="mb-12">
                        {CUISINES.map((cuisine) => {
                            const isSelected = selectedMainCuisine === cuisine.value;
                            return (
                                <TouchableOpacity
                                    key={cuisine.value}
                                    onPress={() => setSelectedMainCuisine(cuisine.value)}
                                    className={`flex-row items-center justify-between py-4 border-b border-[#2C2621]/5 ${isSelected ? 'bg-[#D47B5A]/5 -mx-4 px-4 rounded-lg border-b-transparent' : ''}`}
                                >
                                    <Text className={`text-base flex-1 ${isSelected ? 'font-body-bold text-[#D47B5A]' : 'font-body text-[#685D52]'}`}>
                                        {cuisine.label}
                                    </Text>
                                    <View className={`w-5 h-5 rounded-full border flex-items-center justify-center ${isSelected ? 'bg-[#D47B5A] border-[#D47B5A]' : 'border-[#2C2621]/20'}`}>
                                        {isSelected && <View className="w-2 h-2 bg-white rounded-full" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {/* 🟢 STEP 4: SECONDARY CUISINE */}
            {step === 4 && (
                <ScrollView className="flex-1 px-8" showsVerticalScrollIndicator={false}>
                    <Text className="text-4xl font-heading text-[#2C2621] mb-1">Your <Text style={{ color: '#D47B5A' }}>runner up?</Text></Text>
                    <Text className="text-sm font-body text-[#685D52] mb-8 tracking-wide leading-5">Any other cuisine you really enjoy (Optional).</Text>

                    <View className="mb-12">
                        {CUISINES.filter(c => c.value !== selectedMainCuisine).map((cuisine) => {
                            const isSelected = selectedSecondaryCuisine === cuisine.value;
                            return (
                                <TouchableOpacity
                                    key={cuisine.value}
                                    onPress={() => setSelectedSecondaryCuisine(isSelected ? null : cuisine.value)}
                                    className={`flex-row items-center justify-between py-4 border-b border-[#2C2621]/5 ${isSelected ? 'bg-[#D47B5A]/5 -mx-4 px-4 rounded-lg border-b-transparent' : ''}`}
                                >
                                    <Text className={`text-base flex-1 ${isSelected ? 'font-body-bold text-[#D47B5A]' : 'font-body text-[#685D52]'}`}>
                                        {cuisine.label}
                                    </Text>
                                    <View className={`w-5 h-5 rounded-full border flex-items-center justify-center ${isSelected ? 'bg-[#D47B5A] border-[#D47B5A]' : 'border-[#2C2621]/20'}`}>
                                        {isSelected && <View className="w-2 h-2 bg-white rounded-full" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {/* 🟢 STEP 5: VISUAL GRID */}
            {step === 5 && (
                <View className="flex-1">
                    <View className="px-8 pb-4">
                        <Text className="text-4xl font-heading text-[#2C2621] mb-1">
                            What looks <Text style={{ color: '#D47B5A' }}>good?</Text>
                        </Text>
                        <Text className="text-sm font-body text-[#685D52] mb-2 tracking-wide leading-5">
                            Don't think about ingredients. Tap the <Text className="font-body-bold text-[#D47B5A]">3 dishes</Text> that make you hungry right now.
                        </Text>
                        <Text className="text-xs font-body text-[#A3978B] uppercase tracking-widest mt-2 mb-2">
                            {selectedIds.length}/3 Selected
                        </Text>
                    </View>

                    {loading ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="#D47B5A" />
                            <Text className="mt-4 font-body text-[#A3978B]">Curating your visual menu...</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
                                {dishes.map((dish) => {
                                    const isSelected = selectedIds.includes(dish.id);
                                    return (
                                        <TouchableOpacity
                                            key={dish.id}
                                            onPress={() => toggleDishSelection(dish.id)}
                                            activeOpacity={0.8}
                                            style={{
                                                width: imageSize,
                                                height: imageSize * 1.2,
                                                borderRadius: 16,
                                                overflow: 'hidden',
                                                position: 'relative',
                                                backgroundColor: dish.imageUrl ? 'transparent' : '#FDEEE7' // Light orange background for fallback
                                            }}
                                        >
                                            {dish.imageUrl ? (
                                                <Image
                                                    source={{ uri: dish.imageUrl }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="flex-1 items-center justify-center p-3">
                                                    <Text className="text-[#685D52] font-body-bold text-[10px] text-center mb-1 leading-3" numberOfLines={3}>
                                                        {dish.dish_name}
                                                    </Text>
                                                    <Text className="text-[#D47B5A] font-body text-[8px] uppercase tracking-widest">
                                                        {dish.region_tag}
                                                    </Text>
                                                </View>
                                            )}

                                            <View style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundColor: isSelected ? 'rgba(212, 123, 90, 0.4)' : (dish.imageUrl ? 'rgba(0,0,0,0.2)' : 'transparent'),
                                                borderWidth: isSelected ? 4 : 0,
                                                borderColor: '#D47B5A',
                                                borderRadius: 16
                                            }} />

                                            {dish.imageUrl && (
                                                <View className="absolute bottom-0 w-full p-2">
                                                    <Text className="text-white font-body-bold text-[10px] shadow-sm tracking-wide leading-3" numberOfLines={2}>
                                                        {dish.dish_name}
                                                    </Text>
                                                </View>
                                            )}

                                            {isSelected && (
                                                <View className="absolute top-2 right-2 bg-white rounded-full">
                                                    <CheckCircle2 color="#D47B5A" size={20} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}
                </View>
            )}

            {/* Bottom Floating Action Bar */}
            <View style={{ bottom: Math.max(insets.bottom, 20) }} className="absolute left-6 right-6">
                <TouchableOpacity
                    onPress={step === 5 ? handleFinish : handleNextStep}
                    disabled={saving || (step === 5 && selectedIds.length !== 3)}
                    style={{
                        backgroundColor: (step < 5 || selectedIds.length === 3) ? '#D47B5A' : '#A3978B',
                        borderRadius: 20,
                        paddingVertical: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: (step < 5 || selectedIds.length === 3) ? '#D47B5A' : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        elevation: 5
                    }}
                >
                    <Text className="text-white font-body-bold text-sm uppercase tracking-[0.1em] mr-2">
                        {saving ? 'Creating Profile...' : step === 5 ? 'Build My Menu' : 'Continue'}
                    </Text>
                    {!saving && (step < 5 || selectedIds.length === 3) && <ArrowRight color="white" size={18} />}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default MealOnboardingScreen;
