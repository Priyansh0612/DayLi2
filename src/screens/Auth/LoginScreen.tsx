import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, StatusBar, useWindowDimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';


// 1. Import Native Google Sign In
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import { supabase } from '../../config/supabase';

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Input from '../../components/Input';
import OTPModal from '../../components/Auth/OTPModal';
import EtherealBackground from '../../components/EtherealBackground';


const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID;

// ─── Design Tokens ────────────────────────────────────────────
const C = {
    canvas: '#FFFFFF',
    surface: '#FFFFFF',
    line: '#EBEBEB',
    tint: '#F2F2F0',
    primary: '#4A3B43',
    ink: '#1A1916',
    muted: '#7A6E68',
    ghost: '#B2A89E',
    academic: '#6366f1',
    meal: '#C4663A',
    work: '#0077B6',
    expense: '#2F5233',
};

// ─── Frosted Glass Input (Upgraded for Contrast & Depth) ──────────────────────
const FrostedInput = React.forwardRef<TextInput, any>(({ icon: Icon, rightIcon: RightIcon, onRightIconPress, onPress, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const iconAndTextColor = '#5A5370';
    const placeholderColor = '#8A849E';
    const focusBrandColor = '#7C61EE'; // Used to highlight active state

    const textInputStyle: any = {
        flex: 1,
        height: '100%',
        paddingVertical: 0,
        textAlignVertical: 'center' as const,
        includeFontPadding: false,
        lineHeight: 20,
        fontSize: 16,
        color: '#1A1630',
        fontFamily: 'PlusJakartaSans_400Regular',
        ...(Platform.OS === 'web' ? { outline: 'none', whiteSpace: 'nowrap' } : {}),
    };

    const inner = (
        <>
            {Icon && <Icon size={20} color={isFocused ? focusBrandColor : iconAndTextColor} strokeWidth={1.8} style={{ marginRight: 12 }} />}
            <TextInput
                ref={ref}
                {...props}
                multiline={false}
                scrollEnabled={false}
                editable={!onPress}
                placeholderTextColor={placeholderColor}
                style={textInputStyle}
                onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            />
            {RightIcon && (
                <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress} style={{ padding: 4 }}>
                    <RightIcon size={20} color={iconAndTextColor} strokeWidth={1.8} />
                </TouchableOpacity>
            )}
        </>
    );

    return (
        <View style={{ marginBottom: 16 }}>
            {/* 1. THE LIFT: A dedicated wrapper to cast a soft drop shadow without getting clipped */}
            <View style={{
                shadowColor: '#1A1630', // Deep ink color for the shadow
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isFocused ? 0.12 : 0.05, // Shadow deepens when focused
                shadowRadius: 16,
                elevation: isFocused ? 4 : 2,
            }}>
                {/* 2. THE GLASS: The actual input container */}
                <View style={{
                    height: 60,
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1.5,
                    // 3. THE SNAP: Border turns brand purple when tapped, stays bright white otherwise
                    borderColor: isFocused ? focusBrandColor : 'rgba(255, 255, 255, 0.9)',
                }}>
                    {Platform.OS === 'ios' ? (
                        <BlurView
                            intensity={isFocused ? 40 : 50}
                            tint="light"
                            style={{
                                flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
                                // Slightly thicker white base to ensure text remains readable
                                backgroundColor: isFocused ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.25)',
                            }}
                        >
                            {inner}
                        </BlurView>
                    ) : (
                        <View style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
                            backgroundColor: isFocused ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.6)',
                        }}>
                            {inner}
                        </View>
                    )}
                </View>
            </View>
            {error && <Text style={{ color: '#ef4444', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginTop: 6, marginLeft: 16 }}>{error}</Text>}
        </View>
    );
});

const LoginScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loadingAction, setLoadingAction] = useState<'login' | 'signup' | 'reset' | 'google' | null>(null);
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [isOTPVisible, setIsOTPVisible] = useState(false);
    const passwordRef = useRef<TextInput>(null);


    const { width } = useWindowDimensions();
    const isDesktop = width >= 768; // Tailwind 'md' matches 768px usually
    const iconColor = "#94a3b8"; // slate-400 for standard visibility everywhere
    const placeholderColor = "#94a3b8"; // Keep slate-400 for both for now, visible on white


    // 🟢 Configure Google Sign-In
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: WEB_CLIENT_ID,
            iosClientId: IOS_CLIENT_ID,

            scopes: ['profile', 'email'],
        });
    }, []);

    // 🟢 Listen for Auth State Changes (Auto-Navigate)
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                console.log("✅ User signed in successfully:", session.user.email);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const validatePassword = (pass: string) => {
        if (pass.length < 8) return "Password must be at least 8 characters long.";
        // if (!/[A-Z]/.test(pass)) return "Password must contain at least one uppercase letter.";
        if (!/[0-9]/.test(pass)) return "Password must contain at least one number.";
        // if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Password must contain at least one special character.";
        return null;
    };

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter both email and password");
            return;
        }

        // 🔒 Security Check: Password Strength on Signup
        if (!isLogin) {
            const passwordError = validatePassword(password);
            if (passwordError) {
                Alert.alert("Weak Password", passwordError);
                return;
            }
        }

        setLoadingAction(isLogin ? 'login' : 'signup');
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                // Open the verification modal
                setIsOTPVisible(true);
            }

        } catch (error: any) {
            // 🛡️ Improved Error Handling
            if (error.message.includes("Invalid login credentials") || error.message.includes("User not found")) {
                Alert.alert(
                    "Login Failed",
                    "Invalid email or password. If you haven't signed up yet, please create an account."
                );
            } else {
                Alert.alert("Authentication Error", error.message);
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const handleForgotPassword = async () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            Alert.alert("We need your email", "Please enter your email above so we know where to send the reset link.");
            return;
        }

        setLoadingAction('reset');
        console.log("Attempting password reset for:", trimmedEmail);

        try {
            // 🔗 Create a deep link that redirects back to the app
            const resetLink = Linking.createURL('reset-password');
            console.log("Reset Redirect Link:", resetLink);

            const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                redirectTo: resetLink,
            });

            if (error) {
                console.error("Reset Error:", error);
                throw error;
            }

            console.log("Reset link sent successfully!");
            Alert.alert("Check your email", `Password reset instructions have been sent to ${trimmedEmail}.`);
        } catch (error: any) {
            Alert.alert("Reset Failed", error.message);
        } finally {
            setLoadingAction(null);
        }
    };

    // 🟢 Google Sign-In Flow
    const handleGoogleLogin = async () => {
        try {
            setLoadingAction('google');

            // A. Check for Play Services
            await GoogleSignin.hasPlayServices();

            // B. Open the System Popup (Native)
            const userInfo = await GoogleSignin.signIn();
            console.log("Native Login Info:", userInfo);

            // C. Send the ID Token to Supabase
            if (userInfo.data?.idToken) {
                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: userInfo.data.idToken,
                });

                if (error) throw error;

                // Success! The 'useEffect' above will catch the SIGNED_IN event.
            } else {
                throw new Error('No ID token present!');
            }

        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log("User cancelled the login");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log("Sign in is already in progress");
            } else {
                Alert.alert("Google Error", error.message);
            }
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* Spatial Ethereal Background */}
            <EtherealBackground />

            <View style={{ flex: 1, paddingTop: insets.top }} className="relative z-10 w-full">
                <KeyboardAwareScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                    enableOnAndroid={true}
                    extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
                    enableAutomaticScroll={Platform.OS === 'ios'}
                >
                    <View style={{ flex: 1, justifyContent: 'space-between', paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }}>

                        {/* ─── TOP SECTION: Logo, Inputs, Main Buttons ─── */}
                        <View>
                            {/* Top Brand Section */}
                            <View style={{ alignItems: 'center', paddingTop: 48, paddingBottom: 32 }}>
                                <Text style={{ color: '#1A1630', fontFamily: 'Outfit_700Bold', fontSize: 48, lineHeight: 56 }}>DayLi</Text>
                                <Text style={{ color: '#4A4560', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16, marginTop: 4 }}>
                                    Your life, beautifully organized.
                                </Text>
                            </View>

                            {/* Welcome Block */}
                            <View style={{ paddingHorizontal: 8, marginBottom: 28 }}>
                                <Text style={{ color: '#1A1630', fontFamily: 'Outfit_700Bold', fontSize: 30, marginBottom: 4 }}>
                                    {isLogin ? 'Welcome back 👋' : 'Join the club ✨'}
                                </Text>
                                <Text style={{ color: '#5A5370', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                                    {isLogin ? 'Ready to crush your day?' : "Let's get started on your organized journey!"}
                                </Text>
                            </View>

                            {/* Frosted Glass Inputs */}
                            <FrostedInput
                                icon={Mail}
                                placeholder="Email"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                textContentType="emailAddress"
                                autoComplete="email"
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                                blurOnSubmit={false}
                            />

                            <FrostedInput
                                ref={passwordRef}
                                icon={Lock}
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                rightIcon={showPassword ? EyeOff : Eye}
                                onRightIconPress={() => setShowPassword(!showPassword)}
                                textContentType={isLogin ? 'password' : 'newPassword'}
                                autoComplete={isLogin ? 'password' : 'password-new'}
                                returnKeyType="done"
                                onSubmitEditing={handleAuth}
                            />

                            {/* Forgot Password */}
                            {isLogin && (
                                <TouchableOpacity onPress={handleForgotPassword} style={{ alignItems: 'flex-end', marginBottom: 28, marginTop: -4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {loadingAction === 'reset' && <ActivityIndicator size="small" color="#1A1630" style={{ marginRight: 6 }} />}
                                        <Text style={{ fontSize: 14, color: '#1A1630', fontFamily: 'PlusJakartaSans_600SemiBold', opacity: email.length === 0 ? 0.35 : 1 }}>
                                            {loadingAction === 'reset' ? 'Sending Link...' : 'Forgot Password?'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {!isLogin && <View style={{ height: 24 }} />}

                            {/* Primary Log In Button */}
                            <TouchableOpacity onPress={handleAuth} disabled={loadingAction !== null} activeOpacity={0.88} style={{ height: 58, borderRadius: 999, overflow: 'hidden', marginBottom: 16, shadowColor: '#9370F0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 }}>
                                <LinearGradient colors={['#7C61EE', '#9370F0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                    {loadingAction === 'login' || loadingAction === 'signup' ? (
                                        <>
                                            <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                                            <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, includeFontPadding: false }}>{isLogin ? 'Logging in...' : 'Creating Account...'}</Text>
                                        </>
                                    ) : (
                                        <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, includeFontPadding: false }}>{isLogin ? 'Log In' : 'Create Account'}</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Google Button */}
                            <TouchableOpacity onPress={handleGoogleLogin} disabled={loadingAction !== null} activeOpacity={0.88} style={{ height: 58, borderRadius: 999, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}>
                                {loadingAction === 'google' ? (
                                    <ActivityIndicator color="#4A3B43" style={{ marginRight: 10 }} />
                                ) : (
                                    <Image source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }} style={{ width: 20, height: 20, marginRight: 10 }} resizeMode="contain" />
                                )}
                                <Text style={{ color: '#1A1916', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, includeFontPadding: false }}>
                                    {loadingAction === 'google' ? 'Connecting...' : 'Continue with Google'}
                                </Text>
                            </TouchableOpacity>

                            {/* Toggle Login / Sign Up — now grouped with main actions */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
                                <Text style={{ color: '#5A5370', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginRight: 4 }}>
                                    {isLogin ? 'New here?' : 'Already have an account?'}
                                </Text>
                                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} activeOpacity={0.7}>
                                    <Text style={{ color: '#1A1630', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }}>
                                        {isLogin ? 'Sign up' : 'Log in'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ─── INVISIBLE SPACER: Pushes the footer down ─── */}
                        <View style={{ flex: 1, minHeight: 48 }} />

                        {/* ─── BOTTOM SECTION: Anchored Footer ─── */}
                        <View style={{ alignItems: 'center' }}>
                            {/* Legal Footer */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => Linking.openURL('https://dayli.app/terms')}>
                                    <Text style={{ color: '#1A1630', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11 }}>Terms of Service</Text>
                                </TouchableOpacity>
                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#B0A8C8', marginHorizontal: 10 }} />
                                <TouchableOpacity onPress={() => Linking.openURL('https://dayli.app/privacy')}>
                                    <Text style={{ color: '#1A1630', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11 }}>Privacy Policy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </View>
                </KeyboardAwareScrollView>
            </View>

            {/* OTP Verification Modal */}
            <OTPModal
                visible={isOTPVisible}
                email={email.trim()}
                onClose={() => setIsOTPVisible(false)}
            />
        </View>

    );
};

export default LoginScreen;