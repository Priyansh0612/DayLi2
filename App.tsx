import './global.css'; // Import global CSS for Tailwind
import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, Platform, Text, TouchableOpacity, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebSidebar } from './src/components/layout/WebSidebar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/config/supabase';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/types/navigation';
// Redundant Session import removed
// Google Fonts
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';

import LoginScreen from './src/screens/Auth/LoginScreen';


import ErrorBoundary from './src/components/ErrorBoundary';
import HomeScreen from './src/screens/HomeScreen';
import AcademicsScreen from './src/screens/AcademicsScreen';
import AddCourseScreen from './src/screens/AddCourseScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import CourseDetailsScreen from './src/screens/CourseDetailsScreen';
import AddAssignmentScreen from './src/screens/AddAssignmentScreen';
import MealOnboardingScreen from './src/screens/MealOnboardingScreen';
import MealLoadingScreen from './src/screens/MealLoadingScreen';
import MealDashboardScreen from './src/screens/MealDashboardScreen';
import MealRecipeDetailScreen from './src/screens/MealRecipeDetailScreen';
import DietarySettingsScreen from './src/screens/DietarySettingsScreen';
import GroceryListScreen from './src/screens/GroceryListScreen';
import ExpenseDashboardScreen from './src/screens/ExpenseDashboardScreen';
import ExpenseStatsScreen from './src/screens/ExpenseStatsScreen';
import AllTransactionsScreen from './src/screens/AllTransactionsScreen';
import ExpenseSetupScreen from './src/screens/ExpenseSetupScreen';
import WorksDashboardScreen from './src/screens/WorksDashboardScreen';
import WorkSetupScreen from './src/screens/WorkSetupScreen';
import ExpenseSettingsScreen from './src/screens/ExpenseSettingsScreen';
import WorkSettingsScreen from './src/screens/WorkSettingsScreen';

// Dev-only flags: both should be false in production builds.
// DEV_MODE_FORCE_PROFILE=true skips the session check and always shows ProfileSetupScreen.
// DEV_MODE_FORCE_ONBOARDING=true forces the onboarding flow for UI testing.
const DEV_MODE_FORCE_PROFILE = false; // TODO: set false before App Store release
const DEV_MODE_FORCE_ONBOARDING = false;
const Stack = createNativeStackNavigator<RootStackParamList>();

// 🔴 1. Tell Expo to KEEP the native splash screen visible!
SplashScreen.preventAutoHideAsync();

export default function App() {
  /* State order is critical */
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [currentRoute, setCurrentRoute] = useState("Home");

  // Load Fonts
  let [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });


  const checkProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (data && data.username) {
        setIsProfileComplete(true);
      } else {
        setIsProfileComplete(false);
      }
    } catch (e) {
      console.log('Profile check failed (likely no profile yet):', e);
      setIsProfileComplete(false);
    } finally {
      // We only stop loading once we know both session AND profile status (if session exists)
      setLoading(false);
    }
  };

  const isMounted = React.useRef(false); // Ref to track mount status

  useEffect(() => {
    if (isMounted.current) return; // Skip if already mounted
    isMounted.current = true;

    // 1. Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await checkProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };
    checkSession();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        // If we just signed in, check profile again
        // But if we are already loaded, we might need to set loading true again?
        // For simplicity, just check profile in background if not blocking
        await checkProfile(session.user.id);
      } else {
        setLoading(false);
        setIsProfileComplete(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 🛡️ 5-MINUTE BACKGROUND TIMEOUT (Security)
  const lastBackgroundTime = React.useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Record the time when the app goes away
        lastBackgroundTime.current = Date.now();
      } else if (nextAppState === 'active') {
        // When coming back, check if we've been away too long
        if (lastBackgroundTime.current) {
          const elapsed = Date.now() - lastBackgroundTime.current;
          const fiveMinutes = 5 * 60 * 1000;

          if (elapsed > fiveMinutes) {
            console.log("🕒 Inactivity timeout: Signing out...");
            await supabase.auth.signOut();
          }
          // Reset the timer
          lastBackgroundTime.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Loading Screen
  // We wait for fonts AND (auth check + profile check)
  // FIX: If we have a session but don't know profile status yet (isProfileComplete is null), KEEP LOADING.
  const appIsReady = !loading && fontsLoaded && !(session && isProfileComplete === null);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // 🔴 3. The exact moment the Root View renders, hide the Splash Screen
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);


  if (!appIsReady) {
    return null;
  }


  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer
            onStateChange={(state) => {
              const route = state?.routes[state?.index];
              if (route) {
                setCurrentRoute(route.name);
              }
            }}
          >
            <StatusBar style="auto" />
            <View className="flex-1 flex-row bg-white">
              {Platform.OS === 'web' && session && isProfileComplete && (
                <WebSidebar activeRouteName={currentRoute} />
              )}
              <View className="flex-1 overflow-hidden">
                <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
                  {!session ? (
                    // Case 1: Not Authenticated
                    <Stack.Screen name="Login" component={LoginScreen} />


                  ) : (!isProfileComplete || DEV_MODE_FORCE_PROFILE) ? (
                    // Case 2: Authenticated but Profile Incomplete
                    <Stack.Screen name="ProfileSetup">
                      {() => <ProfileSetupScreen onProfileComplete={() => setIsProfileComplete(true)} />}
                    </Stack.Screen>
                  ) : (
                    // Case 3: Authenticated & Profile Complete
                    <>
                      {/* 🟢 1. DEV MODE OVERRIDE: If true, this is physically first, so it loads instantly! */}
                      {DEV_MODE_FORCE_ONBOARDING && (
                        <Stack.Screen name="MealOnboarding" component={MealOnboardingScreen} />
                      )}

                      {/* 🟢 2. STANDARD INITIAL SCREEN (Loads first if Dev Mode is false) */}
                      <Stack.Screen name="Home" component={HomeScreen} />
                      <Stack.Screen name="Academics" component={AcademicsScreen} />
                      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
                      <Stack.Screen name="AddCourse" component={AddCourseScreen} options={{ presentation: 'modal' }} />
                      <Stack.Screen name="AddAssignment" component={AddAssignmentScreen} options={{ presentation: 'modal' }} />
                      <Stack.Screen name="ExpenseDashboard" component={ExpenseDashboardScreen} options={{ headerShown: false }} />
                      <Stack.Screen name="ExpenseStats" component={ExpenseStatsScreen} options={{ headerShown: false, presentation: 'modal' }} />
                      <Stack.Screen name="ExpenseSetup" component={ExpenseSetupScreen} options={{ headerShown: false }} />
                      <Stack.Screen name="ExpenseSettings" component={ExpenseSettingsScreen} options={{ headerShown: false }} />
                      <Stack.Screen name="AllTransactions" component={AllTransactionsScreen} options={{ headerShown: false }} />
                      <Stack.Screen name="WorksDashboard" component={WorksDashboardScreen} options={{ headerShown: false }} />
                      <Stack.Screen name="WorkSettings" component={WorkSettingsScreen} options={{ headerShown: false }} />
                      <Stack.Screen name="WorkSetup" component={WorkSetupScreen} options={{ headerShown: false }} />
                      {/* 🟢 3. NORMAL RENDER: If Dev Mode is false, we still need to register the screen here */}
                      {!DEV_MODE_FORCE_ONBOARDING && (
                        <Stack.Screen name="MealOnboarding" component={MealOnboardingScreen} />
                      )}
                      <Stack.Screen name="MealLoading" component={MealLoadingScreen} />
                      <Stack.Screen name="MealDashboard" component={MealDashboardScreen} />
                      <Stack.Screen name="MealRecipeDetail" component={MealRecipeDetailScreen} />
                      <Stack.Screen name="DietarySettings" component={DietarySettingsScreen} />
                      <Stack.Screen name="GroceryList" component={GroceryListScreen} options={{ presentation: 'modal', headerShown: false }} />
                    </>
                  )}
                </Stack.Navigator>
              </View>
            </View>
          </NavigationContainer>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </View>
  );
}
// Temporary Stub for Home Screen
function HomeScreenStub() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator color="blue" />
      {/* We will build the real Dashboard next */}
    </View>
  );
}