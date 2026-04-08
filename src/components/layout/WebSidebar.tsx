import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { Home, BookOpen, User, LogOut, Briefcase, Utensils } from 'lucide-react-native';
import { supabase } from '../../config/supabase';

// Define navigation items
const NAV_ITEMS = [
    { name: 'Home', label: 'Dashboard', icon: Home, route: 'Home' },
    { name: 'Academics', label: 'Academics', icon: BookOpen, route: 'Academics' },
    { name: 'Work', label: 'Work', icon: Briefcase, route: 'Work_Dynamic' }, // Handled dynamically
    { name: 'Meals', label: 'Meals', icon: Utensils, route: 'Meals_Dynamic' }, // Handled dynamically
    { name: 'Profile', label: 'Profile', icon: User, route: 'ProfileSetup' },
    // Wait, App.tsx has: Home, Academics, CourseDetails, AddAssignment, AddCourse
    // It does NOT have a 'Profile' screen in the main authenticated stack explicitly lists? 
    // It has ProfileSetup.
    // Let's assume 'Home' is safe.
];

interface WebSidebarProps {
    activeRouteName?: string;
}

export const WebSidebar = ({ activeRouteName }: WebSidebarProps) => {
    const navigation = useNavigation<any>();

    const isActive = (routeName: string) => {
        // Special case for 'Work' tab highlighting
        if (routeName === 'Work_Dynamic' && (activeRouteName === 'WorkSetup' || activeRouteName === 'WorksDashboard')) {
            return true;
        }
        if (routeName === 'Meals_Dynamic' && (activeRouteName === 'MealDashboard' || activeRouteName === 'MealOnboarding' || activeRouteName === 'DietarySettings' || activeRouteName === 'GroceryList')) {
            return true;
        }
        return activeRouteName === routeName;
    };

    const handleNavigation = async (route: string) => {
        if (route === 'Work_Dynamic') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_work_setup_complete')
                    .eq('id', user.id)
                    .single();

                if (data && data.is_work_setup_complete) {
                    navigation.navigate('WorksDashboard');
                } else {
                    navigation.navigate('WorkSetup');
                }
            }
        } else if (route === 'Meals_Dynamic') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('diet_type')
                    .eq('id', user.id)
                    .single();

                if (data && data.diet_type) {
                    navigation.navigate('MealDashboard');
                } else {
                    navigation.navigate('MealOnboarding');
                }
            }
        } else {
            navigation.navigate(route);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        // Navigation listener in LoginScreen.web should handle the rest, or we force it:
        // navigation.replace('Login');
        window.location.href = '/login'; // Force redirect to login page
    };

    return (
        <View className="w-64 h-full bg-white border-r border-gray-200 flex-col pt-8 pb-6 px-4 hidden md:flex">
            {/* Logo Area */}
            <View className="flex-row items-center mb-10 px-2">
                <Image
                    source={require('../../../assets/Logo.png')}
                    style={{ width: 32, height: 32 }}
                    resizeMode="contain"
                />
                <Text className="ml-3 text-2xl font-heading-bold text-primary">DayLi</Text>
            </View>

            {/* Navigation Items */}
            <View className="flex-1 gap-2">
                {NAV_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.name}
                        onPress={() => handleNavigation(item.route)}
                        className={`flex-row items-center p-3 rounded-xl transition-all ${isActive(item.route)
                            ? 'bg-primary/10'
                            : 'hover:bg-gray-50'
                            }`}
                        style={{
                            // @ts-ignore - web specific style
                            cursor: 'pointer'
                        }}
                    >
                        <item.icon
                            size={20}
                            color={isActive(item.route) ? '#2563EB' : '#6B7280'}
                        />
                        <Text className={`ml-3 font-body-bold text-base ${isActive(item.route) ? 'text-primary' : 'text-gray-500'
                            }`}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Bottom Actions */}
            <TouchableOpacity
                onPress={handleSignOut}
                className="flex-row items-center p-3 rounded-xl hover:bg-red-50 group mt-auto"
                style={{
                    // @ts-ignore
                    cursor: 'pointer'
                }}
            >
                <LogOut size={20} color="#EF4444" />
                <Text className="ml-3 font-body-bold text-base text-red-500">
                    Sign Out
                </Text>
            </TouchableOpacity>
        </View>
    );
};
