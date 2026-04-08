import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, DollarSign, Users, ChefHat } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { cleanForRecipe } from '../utils/stringUtils';

const MealRecipeDetailScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    // 🟢 SMART GRABBER: 
    // This checks if the data is wrapped in 'meal', or passed directly as the object.
    const { meal, mealType, recipe } = route.params || {};

    // If 'meal' has a 'dish' property, use that. 
    // Otherwise, check if 'meal' itself is the dish.
    // Otherwise, check 'recipe'.
    const dish = meal?.dish || meal || recipe;

    // DEBUG LOG: Open your terminal to see what's actually arriving!
    console.log("📥 Detail Screen received:", dish?.dish_name);

    if (!dish || !dish.dish_name) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F9F7F2', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: insets.top }}>
                <ChefHat color="#D47B5A" size={48} />
                <Text className="text-[#2C2621] font-heading text-2xl mt-4 text-center">Recipe Missing</Text>
                <Text className="text-[#685D52] font-body text-center mt-2">
                    We couldn't load the details for this meal. Try regenerating your menu.
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} className="mt-8 bg-[#D47B5A] px-10 py-4 rounded-full">
                    <Text className="text-white font-body-bold uppercase tracking-widest">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Safely fallback to empty arrays if data is missing
    const ingredientsList = dish.ingredients || [];
    const instructionsList = dish.instructions || [];

    return (
        <View className="flex-1 bg-[#F9F7F2]">
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-[#F9F7F2] pb-12">

                {/* 🟢 HERO IMAGE */}
                <View className="h-80 w-full relative">
                    <Image source={{ uri: dish.image_url }} className="w-full h-full" />
                    <View className="absolute inset-0 bg-black/30" />

                    <View style={{ position: 'absolute', top: insets.top, width: '100%', paddingLeft: 16, paddingTop: 8 }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ elevation: 4 }}
                            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mt-2 ml-2"
                        >
                            <ChevronLeft color="white" size={24} />
                        </TouchableOpacity>
                    </View>

                    {/* Image Meta Data */}
                    <View className="absolute bottom-8 left-6 right-6">
                        <Text className="text-[10px] text-white/90 uppercase tracking-[0.2em] font-body-bold mb-2">
                            {mealType || 'Daily Meal'} · {dish.region_tag}
                        </Text>
                        <Text className="text-4xl font-heading text-white leading-tight shadow-sm tracking-tight">
                            {dish.dish_name}
                        </Text>
                    </View>
                </View>

                {/* 🟢 STATS BAND */}
                <View style={{ elevation: 2 }} className="flex-row bg-white border-b border-[#EEEEFB] shadow-sm">
                    <View className="flex-1 py-5 border-r border-[#EEEEFB] items-center">
                        <Clock size={20} color="#D47B5A" />
                        <Text className="text-[9px] uppercase tracking-widest text-[#A3978B] font-body-bold mt-2">Prep Time</Text>
                        <Text className="text-sm font-body-bold text-[#2C2621] mt-0.5">{dish.prep_time_minutes}m</Text>
                    </View>
                    <View className="flex-1 py-5 border-r border-[#EEEEFB] items-center">
                        <DollarSign size={20} color="#D47B5A" />
                        <Text className="text-[9px] uppercase tracking-widest text-[#A3978B] font-body-bold mt-2">Budget Score</Text>
                        <Text className="text-sm font-body-bold text-[#2C2621] mt-0.5">{dish.budget_score}/3</Text>
                    </View>
                    <View className="flex-1 py-5 items-center">
                        <Users size={20} color="#D47B5A" />
                        <Text className="text-[9px] uppercase tracking-widest text-[#A3978B] font-body-bold mt-2">Servings</Text>
                        <Text className="text-sm font-body-bold text-[#2C2621] mt-0.5">1</Text>
                    </View>
                </View>

                {/* 🟢 INGREDIENTS */}
                <View className="px-6 pt-8 mb-6">
                    <View className="flex-row items-baseline justify-between border-b border-[#2C2621]/10 pb-3 mb-4">
                        <Text className="text-2xl font-heading text-[#2C2621]">Ingredients</Text>
                        <Text className="text-2xl font-heading text-[#A3978B]">
                            {ingredientsList.length < 10 ? `0${ingredientsList.length}` : ingredientsList.length}
                        </Text>
                    </View>

                    {ingredientsList.length > 0 ? (
                        ingredientsList.map((ingredient: string, idx: number) => (
                            <View key={idx} className="flex-row items-center py-3.5 border-b border-[#2C2621]/5">
                                <View className="w-1.5 h-1.5 rounded-full bg-[#D47B5A] mr-3" />
                                <Text className="text-[15px] font-body text-[#685D52] flex-1">
                                    {cleanForRecipe(ingredient)}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text className="text-[#A3978B] font-body text-sm mt-4">Ingredients not available.</Text>
                    )}
                </View>

                {/* 🟢 METHOD / STEPS */}
                <View className="px-6 mb-12">
                    <View className="flex-row items-baseline justify-between border-b border-[#2C2621]/10 pb-3 mb-4">
                        <Text className="text-2xl font-heading text-[#2C2621]">Method</Text>
                        <Text className="text-2xl font-heading text-[#A3978B]">
                            {instructionsList.length < 10 ? `0${instructionsList.length}` : instructionsList.length}
                        </Text>
                    </View>

                    {instructionsList.length > 0 ? (
                        <View>
                            {instructionsList.map((step: string, index: number) => (
                                <View key={index} className="flex-row items-start border-b border-[#2C2621]/5 py-6">
                                    <View style={{ elevation: 2 }} className="w-12 h-12 rounded-full border border-[#EEEEFB] bg-white items-center justify-center mr-4 shadow-sm">
                                        <Text className="text-xl font-heading text-[#2C2621]">
                                            {index + 1}
                                        </Text>
                                    </View>
                                    <View className="flex-1 mt-1">
                                        <Text className="text-[10px] font-body-bold uppercase tracking-widest text-[#D47B5A] mb-1.5">Step {index + 1}</Text>
                                        <Text className="text-[15px] font-body text-[#685D52] leading-relaxed">{step}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View className="py-8 items-center opacity-40">
                            <ChefHat color="#A3978B" size={40} />
                            <Text className="text-xs font-body mt-2 text-[#A3978B]">Recipe steps will appear here.</Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </View>
    );
};

export default MealRecipeDetailScreen;
